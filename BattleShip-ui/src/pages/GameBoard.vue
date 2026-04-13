<template>
  <div class="battle-container">
    <div class="header-actions">
      <button class="btn-abandon" @click="abandonGame" title="Abandonner la partie">
        <span class="btn-text">Abandonner</span>
        <span class="btn-icon">✕</span>
      </button>
    </div>
    <div v-if="isSpectator && !gameOver" class="spectator-banner">
      👁️ Vous êtes éliminé — vous observez la partie
    </div>

    <!-- MODE ÉQUIPE : layout gauche/droite -->
    <div v-if="isTeamMode" class="grids-wrapper team-layout">
      <!-- GAUCHE : ma grille + grilles alliés -->
      <div class="team-left">
        <div class="grid-section player-section">
          <h2 class="grid-title">Ma flotte</h2>
          <div class="grid player-grid">
            <div
              v-for="(cell, index) in playerGrid"
              :key="'me-' + index"
              class="cell"
              :class="{
                ship: cell.shipNumber && cell.shipNumber !== 0,
                hit: cell.status === 'hit',
                miss: cell.status === 'miss',
                sunk: cell.status === 'sunk',
                pending: cell.status === 'pending',
              }"
            ></div>
          </div>
        </div>

        <div v-for="ally in allies" :key="'ally-' + ally.id" class="grid-section ally-section">
          <h2 class="grid-title ally-title">🤝 {{ ally.pseudo }}</h2>
          <div class="grid ally-grid">
            <div
              v-for="(cell, index) in ally.grid"
              :key="'ally-cell-' + index"
              class="cell ally-cell"
              :class="{
                hit: cell === 'hit',
                miss: cell === 'miss',
                sunk: cell === 'sunk',
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- CENTRE : timer -->
      <div class="timer-container">
        <div class="timer-circle">
          <svg class="progress-ring" width="100" height="100">
            <circle
              class="progress-ring__circle"
              stroke="white"
              stroke-width="6"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
          </svg>
          <div class="timer-text">{{ turnTimer }}s</div>
        </div>
      </div>

      <!-- DROITE : grilles ennemies -->
      <div class="team-right">
        <div
          v-for="(enemy, i) in enemies"
          :key="'enemy-' + enemy.id"
          class="grid-section enemy-section"
        >
          <h2
            class="grid-title enemy-title"
            :class="{ 'active-target': currentOpponentIndex === i }"
            @click="currentOpponentIndex = i"
            style="cursor: pointer"
          >
            ⚔️ {{ enemy.pseudo }}
            <span v-if="currentOpponentIndex === i" class="target-indicator"> ◀ Ciblé</span>
          </h2>
          <div class="grid opponent-grid">
            <div
              v-for="(cell, index) in enemy.grid"
              :key="'enemy-cell-' + index"
              class="cell"
              :class="{
                hit: cell === 'hit',
                miss: cell === 'miss',
                sunk: cell === 'sunk',
                selected: cell === 'selected',
                pending: cell === 'pending',
              }"
              @click="selectEnemyCell(i, index)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODE 1v1 / BATTLE ROYALE : layout original inchangé -->
    <div v-else class="grids-wrapper">
      <div class="grid-section player-section">
        <h2 class="grid-title">Notre flotte</h2>
        <div class="grid player-grid">
          <div
            v-for="(cell, index) in playerGrid"
            :key="'me-' + index"
            class="cell"
            :class="{
              ship: cell.shipNumber && cell.shipNumber !== 0,
              hit: cell.status === 'hit',
              miss: cell.status === 'miss',
              sunk: cell.status === 'sunk',
              pending: cell.status === 'pending',
            }"
          ></div>
        </div>
      </div>

      <div class="timer-container">
        <div class="timer-circle">
          <svg class="progress-ring" width="100" height="100">
            <circle
              class="progress-ring__circle"
              stroke="white"
              stroke-width="6"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
          </svg>
          <div class="timer-text">{{ turnTimer }}s</div>
        </div>
      </div>

      <div class="grid-section opponent-section">
        <h2 class="grid-title">
          Adversaire
          <select
            v-if="opponents.length > 1"
            v-model="currentOpponentIndex"
            class="opponent-dropdown"
          >
            <option v-for="(opp, i) in opponents" :key="opp.id" :value="i">
              {{ opp.pseudo }}
            </option>
          </select>
        </h2>
        <div class="grid opponent-grid">
          <div
            v-for="(cell, index) in currentOpponent.grid"
            :key="'opp-cell-' + index"
            class="cell"
            :class="{
              hit: cell === 'hit',
              miss: cell === 'miss',
              sunk: cell === 'sunk',
              selected: cell === 'selected',
              pending: cell === 'pending',
            }"
            @click="selectCell(index)"
          ></div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!--  POPUP DE FIN DE PARTIE — REDESIGNÉE               -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="endPopup" class="popup-overlay">
      <div class="popup-content" :class="popupResultClass">
        <!-- Titre résultat -->
        <div class="popup-result-banner">
          <span class="popup-result-icon">{{ popupIcon }}</span>
          <h2 class="popup-result-title">{{ popupMessage }}</h2>
        </div>

        <!-- Bloc récompenses (affiché dès que claimReward a répondu) -->
        <div v-if="rewardData" class="rewards-section">
          <div class="rewards-row">
            <!-- Gold -->
            <div class="reward-card gold-card">
              <span class="reward-card-icon">🪙</span>
              <span class="reward-card-amount">+{{ rewardData.goldGain }}</span>
              <span class="reward-card-label">GOLD</span>
            </div>
            <!-- XP -->
            <div class="reward-card xp-card">
              <span class="reward-card-icon">⭐</span>
              <span class="reward-card-amount">+{{ rewardData.xpGain }}</span>
              <span class="reward-card-label">XP</span>
            </div>
          </div>

          <!-- Level-up banner -->
          <!-- Détail bonus level-up -->
          <div
            v-if="rewardData.levelUp && rewardData.levelUpGoldGain > 0"
            class="levelup-gold-note"
          >
            <span>🎁 Bonus montée de niveau :</span>
            <span class="levelup-gold-amount">+{{ rewardData.levelUpGoldGain }} 🪙</span>
          </div>

          <div v-if="rewardData.levelUp" class="levelup-banner">
            🎉 NIVEAU {{ rewardData.newLevel }} ATTEINT !
          </div>

          <!-- Barre de progression XP -->
          <div class="xp-progress-block">
            <div class="xp-progress-header">
              <span>Niv. {{ rewardData.newLevel }}</span>
              <span>{{ rewardData.xpIntoLevel }} / {{ rewardData.xpNeededForNext }} XP</span>
            </div>
            <div class="xp-bar-track">
              <div class="xp-bar-fill" :style="{ width: xpProgressPercent + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Chargement récompenses -->
        <div v-else class="rewards-loading">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </div>

        <button class="btn-home" @click="goHome">⚓ Retour à l'accueil</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
html,
body {
  max-width: 100%;
  overflow-x: hidden;
  position: relative;
}

/* CONTENEUR PRINCIPAL */
.battle-container {
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at center, #1b2735 0%, #090a0f 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 10px 40px 10px;
  color: white;
  font-family: "Orbitron", sans-serif;
  box-sizing: border-box;
  position: relative;
}

/* BOUTON ABANDONNER */
.header-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.btn-abandon {
  width: auto;
  min-width: 140px;
  padding: 10px 20px;
  background: rgba(198, 40, 40, 0.1);
  border: 1px solid #ff4444;
  border-radius: 5px;
  color: #ff4444;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-abandon:hover {
  background: #c62828;
  color: white;
  box-shadow: 0 0 15px rgba(198, 40, 40, 0.5);
}

.btn-icon {
  display: none;
}

/* WRAPPER DES GRILLES */
.grids-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.grid-section {
  width: 100%;
  max-width: 350px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-title {
  font-size: 1.1rem;
  margin-bottom: 15px;
  text-transform: uppercase;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 2px;
  background: rgba(0, 212, 255, 0.15);
  padding: 4px;
  border: 1px solid rgba(0, 212, 255, 0.4);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  width: 100%;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  background: rgba(10, 25, 47, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.player-grid .cell.ship {
  background: #1e3a5f;
  border: 1px solid #00d4ff;
  box-shadow: inset 0 0 8px rgba(0, 212, 255, 0.3);
}

.cell.hit {
  background: radial-gradient(circle, #ff4444 30%, #7f0000 100%) !important;
  box-shadow: 0 0 12px #ff4444;
  z-index: 1;
}

.cell.miss::after {
  content: "";
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.cell.sunk {
  background: #1a1a1a !important;
  border: 1px solid #444;
}

.cell.sunk::after {
  content: "✕";
  color: #ff4444;
  font-size: 1.1rem;
  font-weight: bold;
  opacity: 0.7;
}

.cell.selected {
  background: rgba(255, 235, 59, 0.2) !important;
  outline: 2px solid #ffeb3b;
  z-index: 2;
}

.cell.pending {
  background-color: #f39c12 !important;
  cursor: not-allowed;
  opacity: 0.7;
  position: relative;
}
.cell.pending::after {
  content: "⏳";
  position: absolute;
  font-size: 10px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* TIMER */
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  flex-shrink: 0;
  align-self: center;
}

.timer-circle {
  width: 100px;
  height: 100px;
  position: relative;
}

.progress-ring {
  transform: rotate(-90deg);
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

.opponent-dropdown {
  background: #0a192f;
  color: #00d4ff;
  border: 1px solid #00d4ff;
  padding: 4px 8px;
  font-family: "Orbitron";
  font-size: 0.8rem;
  border-radius: 4px;
  margin-left: 10px;
}

/* ═══════════════════════════════════════════════════════ */
/*  POPUP DE FIN DE PARTIE — REDESIGNÉ                    */
/* ═══════════════════════════════════════════════════════ */

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(6px);
}

.popup-content {
  background: linear-gradient(145deg, #0d1f35 0%, #091524 100%);
  padding: 36px 40px 32px;
  border-radius: 18px;
  text-align: center;
  max-width: 420px;
  width: 92%;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.07),
    0 30px 80px rgba(0, 0, 0, 0.7);
  animation: popupIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Bordure colorée selon le résultat */
.popup-victory {
  border: 1px solid rgba(255, 215, 0, 0.5);
  box-shadow:
    0 0 0 1px rgba(255, 215, 0, 0.15),
    0 30px 80px rgba(0, 0, 0, 0.7),
    inset 0 0 60px rgba(255, 215, 0, 0.04);
}

.popup-defeat {
  border: 1px solid rgba(255, 68, 68, 0.4);
  box-shadow:
    0 0 0 1px rgba(255, 68, 68, 0.12),
    0 30px 80px rgba(0, 0, 0, 0.7),
    inset 0 0 60px rgba(255, 68, 68, 0.04);
}

.popup-draw {
  border: 1px solid rgba(0, 212, 255, 0.4);
  box-shadow:
    0 0 0 1px rgba(0, 212, 255, 0.12),
    0 30px 80px rgba(0, 0, 0, 0.7),
    inset 0 0 60px rgba(0, 212, 255, 0.04);
}

/* RÉSULTAT */
.popup-result-banner {
  margin-bottom: 24px;
}

.popup-result-icon {
  display: block;
  font-size: 3rem;
  margin-bottom: 8px;
  animation: bounceIn 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes bounceIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.popup-result-title {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin: 0;
}

.popup-victory .popup-result-title {
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}
.popup-defeat .popup-result-title {
  color: #ff5555;
  text-shadow: 0 0 20px rgba(255, 85, 85, 0.4);
}
.popup-draw .popup-result-title {
  color: #00d4ff;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
}

/* RÉCOMPENSES */
.rewards-section {
  animation: fadeSlideUp 0.4s 0.3s ease both;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rewards-row {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 20px;
}

.reward-card {
  flex: 1;
  max-width: 140px;
  padding: 16px 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.gold-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(255, 165, 0, 0.08) 100%);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.xp-card {
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.12) 0%, rgba(0, 150, 255, 0.08) 100%);
  border: 1px solid rgba(100, 200, 255, 0.3);
}

.reward-card-icon {
  font-size: 1.8rem;
}

.reward-card-amount {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 1px;
}

.gold-card .reward-card-amount {
  color: #ffd700;
}
.xp-card .reward-card-amount {
  color: #64c8ff;
}

.reward-card-label {
  font-size: 0.65rem;
  letter-spacing: 2px;
  opacity: 0.6;
  text-transform: uppercase;
}

/* LEVEL-UP GOLD NOTE */
.levelup-gold-note {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 215, 0, 0.07);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.72rem;
  color: rgba(255, 215, 0, 0.75);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}
.levelup-gold-amount {
  font-weight: 900;
  color: #ffd700;
}

/* LEVEL UP */
.levelup-banner {
  background: linear-gradient(
    90deg,
    rgba(255, 215, 0, 0.15),
    rgba(255, 165, 0, 0.2),
    rgba(255, 215, 0, 0.15)
  );
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  margin-bottom: 20px;
  animation: levelUpPulse 1s ease infinite alternate;
}

@keyframes levelUpPulse {
  from {
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.2);
  }
  to {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
}

/* BARRE XP */
.xp-progress-block {
  margin-bottom: 24px;
}

.xp-progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.xp-bar-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00b4ff, #00e5ff);
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
  transition: width 1s ease 0.5s;
}

/* LOADING RÉCOMPENSES */
.rewards-loading {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 28px 0;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: rgba(0, 212, 255, 0.5);
  border-radius: 50%;
  animation: dotBounce 1s ease infinite;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dotBounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

/* BOUTON ACCUEIL */
.btn-home {
  margin-top: 4px;
  padding: 13px 32px;
  background: linear-gradient(135deg, #00b4ff, #0070cc);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: "Orbitron";
  text-transform: uppercase;
  letter-spacing: 1.5px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(0, 180, 255, 0.3);
}

.btn-home:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 28px rgba(0, 180, 255, 0.5);
}

/* PROGRESS RING */
.progress-ring {
  transform: rotate(-90deg);
  transition: stroke-dashoffset 0.3s linear;
}

.progress-ring__circle {
  stroke-dasharray: 282.7;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
}

.timer-low {
  stroke: #ff4444 !important;
  filter: drop-shadow(0 0 5px #ff4444);
}

/* Layout mode équipe */
.team-layout {
  align-items: flex-start;
}

.team-left,
.team-right {
  display: flex;
  flex-direction: column;
  gap: 30px;
  flex: 1 1 300px;
  align-items: center;
  width: 100%;
}

.ally-section {
  width: 100%;
  max-width: 250px;
  background: rgba(0, 200, 80, 0.05);
  border: 1px solid rgba(0, 200, 80, 0.2);
  border-radius: 10px;
  padding: 15px;
  box-sizing: border-box;
}

.ally-title {
  color: #4caf50 !important;
  font-size: 0.9rem !important;
}

.enemy-title {
  color: #ef5350 !important;
  transition: opacity 0.2s;
}

.enemy-title:hover {
  opacity: 0.8;
}

.active-target {
  text-shadow: 0 0 8px rgba(255, 100, 100, 0.6);
}

.target-indicator {
  font-size: 0.7rem;
  color: #ff8a80;
  margin-left: 6px;
}

.ally-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 1px;
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1 / 1;
}

.ally-cell {
  width: 100%;
  height: 100%;
  cursor: default;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ally-cell:hover {
  background: rgba(255, 255, 255, 0.04);
}

.spectator-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(239, 83, 80, 0.15);
  border-bottom: 1px solid rgba(239, 83, 80, 0.4);
  color: #ef5350;
  text-align: center;
  padding: 8px;
  font-size: 0.85rem;
  letter-spacing: 1px;
  z-index: 50;
}

/* RESPONSIVE */
@media (max-width: 850px) {
  .team-left {
    order: 1;
  }
  .timer-container {
    order: 2;
    position: static;
    margin: 10px 0;
  }
  .team-right {
    order: 3;
  }

  .battle-container {
    padding-top: 80px;
  }
  .header-actions {
    top: 15px;
    right: 15px;
  }

  .btn-abandon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    padding: 0;
    border-radius: 50%;
  }

  .btn-text {
    display: none;
  }
  .btn-icon {
    display: block;
    font-size: 1.4rem;
    font-weight: bold;
  }

  .grids-wrapper,
  .team-layout {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .grid-title {
    font-size: 0.9rem;
    margin-bottom: 8px;
  }
  .player-section {
    order: 1;
  }
  .timer-container {
    order: 2;
    margin: 5px 0;
    transform: scale(0.85);
  }
  .opponent-section {
    order: 3;
  }
  .grid-section {
    max-width: 92vw;
    margin: 0 auto;
  }

  .popup-content {
    padding: 28px 22px 24px;
  }
  .popup-result-title {
    font-size: 1.3rem;
  }
  .rewards-row {
    gap: 10px;
  }
  .reward-card {
    padding: 12px 8px;
  }
  .reward-card-amount {
    font-size: 1.25rem;
  }
}
</style>

<script>
import socket from "../services/socket.js";
import heartbeatSrc from "@/assets/audio/BattementsDeCoeur.mp3";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default {
  name: "GameBoard",
  props: {
    gameId: { type: String, required: true },
    gameType: { type: String, required: true },
  },
  data() {
    return {
      playerGrid: Array.from({ length: 100 }, () => ({ shipNumber: 0, status: "" })),
      opponents: [],
      allies: [],
      enemies: [],
      myTeamNumber: null,
      currentOpponentIndex: 0,
      turnTimer: 7,
      gameOver: false,
      fetchInterval: null,
      turnInterval: null,
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      selectedCell: null,
      selectedEnemyIndex: 0,
      endPopup: false,
      popupMessage: "",
      popupIcon: "",
      playerStatus: "in_game",
      hasFiredThisTurn: false,
      isSelecting: false,
      heartbeatAudio: null,
      detectedTeamMode: false,
      isSpectator: false,
      // ── Récompenses ──────────────────────────────────────
      rewardData: null,
      rewardClaimed: false,
    };
  },
  computed: {
    isTeamMode() {
      return ["2v2", "3v3", "4v4"].includes(this.gameType) || this.detectedTeamMode;
    },
    is1v1() {
      return this.gameType === "1v1";
    },
    currentOpponent() {
      return (
        this.opponents[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
    currentEnemy() {
      return (
        this.enemies[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
    // Classe CSS du popup selon victoire/défaite
    popupResultClass() {
      if (!this.popupMessage) return "";
      if (this.popupMessage.includes("Victoire")) return "popup-victory";
      if (this.popupMessage.includes("Défaite")) return "popup-defeat";
      if (this.popupMessage.includes("Égalité")) return "popup-draw";
      return "popup-defeat";
    },
    // Pourcentage de la barre XP
    xpProgressPercent() {
      if (!this.rewardData) return 0;
      const { xpIntoLevel, xpNeededForNext } = this.rewardData;
      if (!xpNeededForNext) return 0;
      return Math.min(100, Math.floor((xpIntoLevel / xpNeededForNext) * 100));
    },
  },
  watch: {
    playerGrid: {
      deep: true,
      handler() {
        this.updateHeartbeatSpeed();
      },
    },
    gameOver(val) {
      if (val) this.stopHeartbeat();
    },
  },
  mounted() {
    this.removeSocketListeners();
    this.initGame();
    this.initAudio();
    this.playHeartbeat();

    socket.on("connect", () => {
      if (!this.gameOver) this.resyncTimer();
    });

    socket.on("turn-timer", (data) => {
      if (data.timeLeft >= 7) this.clearPendingCells();
      this.socketTurnTimer(data);
    });

    socket.on("turn-ended", () => this.endTurn());
    socket.on("shot-fired", (data) => this.onShotFired(data));
    socket.on("player-eliminated", (data) => this.onPlayerEliminated(data));
    socket.on("game-over", (data) => this.handleGameOver(data));
    socket.on("game-started", (data) => this.handleGameStarted(data));

    socket.on("cell-pending", (data) => {
      const { targetId, index, shooterId } = data;
      if (shooterId === this.user.id) return;
      this.updateGridCell(targetId, index, "pending");
    });

    socket.on("cell-unlocked", (data) => {
      const { targetId, index } = data;
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      const opp = pool.find((o) => String(o.id) === String(targetId));
      if (opp && opp.grid[index] === "pending") {
        this.updateGridCell(targetId, index, "");
      }
    });
  },
  beforeUnmount() {
    clearInterval(this.fetchInterval);
    clearInterval(this.turnInterval);
    this.removeSocketListeners();
    this.stopHeartbeat();
  },
  methods: {
    removeSocketListeners() {
      socket.off("turn-timer");
      socket.off("turn-ended");
      socket.off("shot-fired");
      socket.off("player-eliminated");
      socket.off("game-over");
      socket.off("game-started");
      socket.off("cell-pending");
      socket.off("cell-unlocked");
    },

    // ────────────────────────────────────────────────────────
    // SYSTÈME DE RÉCOMPENSES
    // ────────────────────────────────────────────────────────

    /**
     * Appel API pour créditer gold + XP.
     * isVictory : true = victoire, false = défaite/abandon/égalité
     */
    async claimReward(isVictory) {
      // Ne récompenser qu'une seule fois et jamais les spectateurs
      if (this.rewardClaimed || this.isSpectator) return;
      this.rewardClaimed = true;

      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${this.user.id}/reward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isVictory, gameId: this.gameId }),
        });
        const data = await res.json();

        if (data.success) {
          this.rewardData = data;

          // Mettre à jour le localStorage — clés homogènes avec HomeMenu/Profile
          const stored = JSON.parse(localStorage.getItem("user")) || {};
          stored.gold = data.newGold;
          stored.level = data.newLevel;
          stored.xp = data.newXp;
          localStorage.setItem("user", JSON.stringify(stored));
          // Déclencher la mise à jour du menu principal
          import("@/eventBus.js")
            .then(({ userBus }) => {
              userBus.userUpdated = !userBus.userUpdated;
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error("Erreur claimReward :", err);
        // Fallback : afficher les montants localement même si l'API échoue
        this.rewardData = {
          goldGain: isVictory ? 100 : 25,
          xpGain: isVictory ? 50 : 25,
          newLevel: this.user.niveau || 0,
          xpIntoLevel: 0,
          xpNeededForNext: 100,
          levelUp: false,
          newGold: null,
        };
      }
    },

    // ────────────────────────────────────────────────────────
    // SYNC TIRS
    // ────────────────────────────────────────────────────────
    async syncAllShots() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!data || !data.success) return;

        if (data.incomingShots) {
          const updatedGrid = [...this.playerGrid];
          data.incomingShots.forEach((s) => {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (updatedGrid[idx]) {
              updatedGrid[idx].status = s.result ? String(s.result).toLowerCase() : "pending";
            }
          });
          this.playerGrid = updatedGrid;
        }

        const myShots = data.playerShots || [];
        myShots.forEach((s) => {
          if (!s.result) return;
          const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
          this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
        });

        if (this.isTeamMode && data.allShots) {
          data.allShots.forEach((s) => {
            if (s.result && s.state === "resolved") {
              const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
              this.updateGridCell(s.target_id, idx, s.result, s.positions);
            }
          });
        }
      } catch (err) {
        console.error("Erreur syncAllShots:", err);
      }
    },

    /* ----------------- Timer ----------------- */
    socketTurnTimer({ timeLeft }) {
      if (this.gameOver) return;
      if (timeLeft >= 7) {
        this.hasFiredThisTurn = false;
        this.turnTimer = 7;
      } else {
        this.turnTimer = timeLeft;
      }
      this.$nextTick(this.updateCircle);
    },

    async resyncTimer() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/${this.gameId}/timer`);
        const data = await res.json();
        if (data.success && typeof data.timeLeft === "number") {
          this.turnTimer = data.timeLeft;
          this.$nextTick(this.updateCircle);
        }
      } catch (err) {
        console.error("Erreur resyncTimer:", err);
      }
    },

    endTurn() {
      if (this.gameOver) return;
      this.turnTimer = 0;
      this.updateCircle();
      this.validateShot();
      this.hasFiredThisTurn = false;
    },
    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      if (!circle) return;
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const ratio = Math.max(0, Math.min(this.turnTimer / 7, 1));
      const offset = circumference - ratio * circumference;
      circle.style.transition = this.turnTimer === 7 ? "none" : "stroke-dashoffset 1s linear";
      circle.style.strokeDashoffset = offset;
    },

    /* ----------------- Init ----------------- */
    handleGameStarted(data) {
      this.resetGameState();
      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);
      this.syncAllShots();
      this.turnTimer = data.timeLeft || 7;
      this.updateCircle();
    },
    resetGameState() {
      clearInterval(this.turnInterval);
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
      this.turnInterval = null;
      this.turnTimer = 7;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
      this.popupIcon = "";
      this.playerStatus = "in_game";
      this.hasFiredThisTurn = false;
      this.isSelecting = false;
      this.rewardData = null;
      this.rewardClaimed = false;
    },
    async initGame() {
      this.resetGameState();
      await this.fetchPlayerBoard();

      if (this.is1v1) await this.fetchOpponent();
      else await this.fetchOpponents();

      await this.$nextTick();
      await this.syncAllShots();
      await this.fetchEnemyShots();

      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });
      socket.emit("player-ready", { gameId: this.gameId, playerId: this.user.id });

      if (!this.fetchInterval) {
        this.fetchInterval = setInterval(async () => {
          await this.fetchEnemyShots();
          await this.checkGameStatus();
        }, 2000);
      }
    },

    /* ----------------- Grilles ----------------- */
    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/board?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        this.playerGrid = data.board
          .flat()
          .map((cell) => ({ shipNumber: cell > 0 ? cell : 0, status: "" }));
      } catch (err) {
        console.error("Erreur fetchPlayerBoard :", err);
      }
    },
    async fetchOpponent() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/opponent?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        this.opponents = [
          {
            id: data.opponentId,
            pseudo: data.opponentPseudo || "Adversaire",
            grid: Array(100).fill(""),
          },
        ];
        this.currentOpponentIndex = 0;
      } catch (err) {
        console.error(err);
      }
    },
    async fetchOpponents() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/opponents?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        this.myTeamNumber = data.myTeamNumber ?? null;
        const all = data.opponents.map((o) => ({ ...o, grid: Array(100).fill("") }));

        if (this.myTeamNumber !== null) {
          this.detectedTeamMode = true;
          this.allies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) === Number(this.myTeamNumber),
          );
          this.enemies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) !== Number(this.myTeamNumber),
          );
          this.opponents = all;
          this.currentOpponentIndex = 0;
        } else {
          this.detectedTeamMode = false;
          this.opponents = all;
          this.allies = [];
          this.enemies = [];
          if (all.length > 0) {
            const allIds = [...all.map((o) => Number(o.id)), Number(this.user.id)].sort(
              (a, b) => a - b,
            );
            const myIndex = allIds.indexOf(Number(this.user.id));
            const targetId = allIds[(myIndex + 1) % allIds.length];
            const finalIndex = all.findIndex((o) => Number(o.id) === Number(targetId));
            this.currentOpponentIndex = finalIndex !== -1 ? finalIndex : 0;
          }
        }
      } catch (err) {
        console.error("Erreur fetchOpponents:", err);
      }
    },
    updateGridCell(targetId, index, value, positions = []) {
      const resClean = String(value).toLowerCase();

      const patchArray = (array) => {
        const idxInArray = array.findIndex((o) => String(o.id) === String(targetId));
        if (idxInArray !== -1) {
          const newGrid = [...array[idxInArray].grid];
          newGrid[index] = resClean;

          if (positions && positions.length > 0) {
            positions.forEach((p) => {
              newGrid[p.y * 10 + p.x] = "sunk";
            });
          }

          array[idxInArray] = { ...array[idxInArray], grid: newGrid };
          return true;
        }
        return false;
      };

      const hasChanged = patchArray(this.opponents);

      if (this.isTeamMode) {
        patchArray(this.enemies);
        patchArray(this.allies);
        this.enemies = [...this.enemies];
        this.allies = [...this.allies];
      }

      if (hasChanged) {
        this.opponents = [...this.opponents];
      }
    },

    async checkGameStatus() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/status?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        if (data.status === "finished" && !this.gameOver) {
          this.handleGameOver({
            winnerId: data.winner_id,
            winnerTeam: data.winner_team ?? null,
            isDraw: data.winner_id === null && data.winner_team === null,
          });
        }
      } catch (err) {
        console.error("Erreur checkGameStatus:", err);
      }
    },

    /* ----------------- Sélection & Tir ----------------- */
    selectCell(index) {
      if (
        this.gameOver ||
        this.playerStatus === "dead" ||
        this.hasFiredThisTurn ||
        this.isSelecting ||
        this.turnTimer === 0
      )
        return;

      const val = this.currentOpponent.grid[index];
      if (["hit", "miss", "sunk", "pending"].includes(val)) return;
      if (this.selectedCell === index) return;

      this.isSelecting = true;

      if (this.selectedCell !== null) {
        const oldIndex = this.selectedCell;
        this.updateGridCell(this.currentOpponent.id, oldIndex, "");
        socket.emit("unlock-cell", {
          gameId: this.gameId,
          targetId: this.currentOpponent.id,
          index: oldIndex,
          shooterId: this.user.id,
        });
      }

      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent.id, index, "selected");
      socket.emit("lock-cell", {
        gameId: this.gameId,
        targetId: this.currentOpponent.id,
        index,
        shooterId: this.user.id,
      });

      setTimeout(() => {
        this.isSelecting = false;
      }, 150);
    },

    selectEnemyCell(enemyIndex, cellIndex) {
      if (
        this.gameOver ||
        this.playerStatus === "dead" ||
        this.hasFiredThisTurn ||
        this.isSelecting ||
        this.turnTimer === 0
      )
        return;

      const enemy = this.enemies[enemyIndex];
      if (!enemy) return;

      const val = enemy.grid[cellIndex];
      if (["hit", "miss", "sunk", "pending"].includes(val)) return;

      this.isSelecting = true;

      if (this.selectedCell !== null) {
        const prevEnemy = this.enemies[this.currentOpponentIndex];
        if (prevEnemy) {
          this.updateGridCell(prevEnemy.id, this.selectedCell, "");
          socket.emit("unlock-cell", {
            gameId: this.gameId,
            targetId: prevEnemy.id,
            index: this.selectedCell,
            shooterId: this.user.id,
          });
        }
      }

      this.currentOpponentIndex = enemyIndex;
      this.selectedCell = cellIndex;
      this.updateGridCell(enemy.id, cellIndex, "selected");
      socket.emit("lock-cell", {
        gameId: this.gameId,
        targetId: enemy.id,
        index: cellIndex,
        shooterId: this.user.id,
      });

      setTimeout(() => {
        this.isSelecting = false;
      }, 150);
    },

    clearPendingCells() {
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      pool.forEach((opp) => {
        opp.grid = opp.grid.map((cell) => (cell === "pending" || cell === "selected" ? "" : cell));
      });
      this.selectedCell = null;
    },

    async validateShot() {
      if (this.gameOver || this.hasFiredThisTurn || this.playerStatus === "dead") return;

      const targetPool = this.isTeamMode ? this.enemies : this.opponents;
      const target = targetPool[this.currentOpponentIndex];
      if (!target) return;

      let index = this.selectedCell;
      if (index === null) {
        const available = [];
        target.grid.forEach((v, i) => {
          if (!["hit", "miss", "sunk"].includes(v)) available.push(i);
        });
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }

      this.hasFiredThisTurn = true;
      await this.sendShoot(index, target);
    },

    onPlayerEliminated(data) {
      if (data.playerId === this.user.id) {
        if (this.playerStatus === "dead") return;
        this.playerStatus = "dead";
        if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          const msg =
            data.reason === "abandon"
              ? "🏳️ Éliminé par abandon"
              : "💥 Tous vos navires ont coulé !";
          this.claimReward(false);
          this.showEndPopup(msg, false);
        }
        return;
      }

      if (this.isTeamMode) {
        const wasCurrentEnemy = this.enemies[this.currentOpponentIndex]?.id === data.playerId;
        this.enemies = this.enemies.filter((o) => o.id !== data.playerId);
        this.allies = this.allies.filter((o) => o.id !== data.playerId);
        if (wasCurrentEnemy && this.currentOpponentIndex >= this.enemies.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      } else {
        const isCurrentTarget = this.opponents[this.currentOpponentIndex]?.id === data.playerId;
        this.opponents = this.opponents.filter((opp) => opp.id !== data.playerId);
        if (isCurrentTarget || this.currentOpponentIndex >= this.opponents.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      }
      this.opponents = this.opponents.filter((o) => o.id !== data.playerId);
    },

    async sendShoot(index, targetOverride = null) {
      const target = targetOverride || (this.isTeamMode ? this.currentEnemy : this.currentOpponent);
      const x = index % 10;
      const y = Math.floor(index / 10);

      try {
        const res = await fetch(`${API_BASE_URL}/api/games/shoot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: target.id,
            x,
            y,
          }),
        });

        const data = await res.json();
        if (data.success) {
          const finalResult = data.result ? data.result : "pending";
          this.applyShot(target.id, x, y, finalResult, data.positions);
        }
        this.selectedCell = null;
      } catch (err) {
        console.error("Erreur sendShoot:", err);
      }
    },

    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      const resClean = String(result).toLowerCase();

      if (String(targetId) === String(this.user.id)) {
        const newGrid = [...this.playerGrid];
        newGrid[idx] = { ...newGrid[idx], status: resClean };
        positions?.forEach((p) => {
          const pIdx = p.y * 10 + p.x;
          if (newGrid[pIdx]) newGrid[pIdx] = { ...newGrid[pIdx], status: "sunk" };
        });
        this.playerGrid = newGrid;
        return;
      }

      this.updateGridCell(targetId, idx, resClean, positions);
    },

    onShotFired(data) {
      const { targetId, x, y, result, positions } = data;
      const idx = parseInt(y) * 10 + parseInt(x);
      const safeResult = result ? String(result).toLowerCase() : "pending";

      if (String(targetId) === String(this.user.id)) {
        const newGrid = [...this.playerGrid];
        newGrid[idx] = { ...newGrid[idx], status: safeResult };
        if (positions) {
          positions.forEach((p) => {
            const pIdx = p.y * 10 + p.x;
            if (newGrid[pIdx]) newGrid[pIdx] = { ...newGrid[pIdx], status: "sunk" };
          });
        }
        this.playerGrid = newGrid;
        this.checkDefeat();
      } else {
        this.updateGridCell(targetId, idx, safeResult, positions);
      }
    },

    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!data || !data.success) return;

        const incomingShots = data.incomingShots || [];
        if (incomingShots.length > 0) {
          const updatedGrid = [...this.playerGrid];
          let changed = false;

          incomingShots.forEach((s) => {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (!updatedGrid[idx]) return;
            const current = updatedGrid[idx].status;
            const incoming = s.result ? String(s.result).toLowerCase() : null;

            if (!incoming) {
              if (current !== "hit" && current !== "miss" && current !== "sunk") {
                updatedGrid[idx] = { ...updatedGrid[idx], status: "pending" };
                changed = true;
              }
              return;
            }

            if (current !== incoming) {
              updatedGrid[idx] = { ...updatedGrid[idx], status: incoming };
              changed = true;
            }
            if (incoming === "sunk" && s.positions) {
              s.positions.forEach((p) => {
                const pIdx = p.y * 10 + p.x;
                if (updatedGrid[pIdx] && updatedGrid[pIdx].status !== "sunk") {
                  updatedGrid[pIdx] = { ...updatedGrid[pIdx], status: "sunk" };
                  changed = true;
                }
              });
            }
          });

          if (changed) {
            this.playerGrid = updatedGrid;
            this.$nextTick(() => this.checkDefeat());
          }
        }

        const myShots = data.playerShots || [];
        myShots.forEach((s) => {
          if (!s.result) return;
          const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
          if (!this.opponents.find((o) => String(o.id) === String(s.target_id))) {
            this.fetchOpponents();
          }
          this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
        });

        if (data.allShots) {
          data.allShots.forEach((s) => {
            if (String(s.id_player) === String(this.user.id)) return;
            if (String(s.target_id) === String(this.user.id)) return;

            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            const pool = this.isTeamMode ? this.enemies : this.opponents;
            const target = pool.find((o) => String(o.id) === String(s.target_id));
            if (!target) return;

            const currentVal = target.grid[idx];

            if (s.state === "pending" && s.result === null) {
              if (!["hit", "miss", "sunk"].includes(currentVal)) {
                this.updateGridCell(s.target_id, idx, "pending");
              }
            } else if (s.result) {
              if (!["hit", "miss", "sunk"].includes(currentVal)) {
                this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
              }
            }
          });
        }

        if (this.isTeamMode && data.allShots) {
          this.allies.forEach((ally) => {
            const allyShots = data.allShots.filter(
              (s) => Number(s.target_id) === Number(ally.id) && s.result && s.state === "resolved",
            );
            if (!allyShots.length) return;

            const newGrid = [...ally.grid];
            allyShots.forEach((s) => {
              const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
              const result = String(s.result).toLowerCase();
              newGrid[idx] = result;
              if (result === "sunk" && s.positions) {
                s.positions.forEach((p) => {
                  newGrid[p.y * 10 + p.x] = "sunk";
                });
              }
            });
            ally.grid = newGrid;
          });
        }
      } catch (err) {
        console.error("Erreur Sync Shots:", err);
      }
      this.opponents = [...this.opponents];
      if (this.isTeamMode) {
        this.enemies = [...this.enemies];
        this.allies = [...this.allies];
      }
    },

    /* ----------------- Game Over / Abandon ----------------- */
    handleGameOver(payload) {
      if (this.gameOver) return;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();

      let isVictory = false;
      let msg, icon;

      if (payload.isDraw) {
        msg = "Égalité parfaite";
        icon = "⚖️";
        isVictory = false;
      } else if (this.isTeamMode && payload.winnerTeam != null) {
        isVictory = Number(payload.winnerTeam) === Number(this.myTeamNumber);
        msg = isVictory ? "Victoire" : "Défaite";
        icon = isVictory ? "🏆" : "💥";
      } else {
        isVictory = String(payload.winnerId) === String(this.user.id);
        msg = isVictory ? "Victoire" : "Défaite";
        icon = isVictory ? "🏆" : "💥";
      }

      // Réclamer la récompense AVANT d'afficher le popup
      this.claimReward(isVictory);
      this.showEndPopup(`${icon} ${msg} !`, isVictory);
    },

    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner ?")) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/eliminate-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, reason: "abandon" }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        this.playerStatus = "dead";
        const myTeamWon = this.isTeamMode ? data.winner_team === this.myTeamNumber : false;

        if (data.finished) {
          this.claimReward(myTeamWon);
          this.showEndPopup(myTeamWon ? "🏆 Victoire !" : "🏳️ Abandon confirmé.", myTeamWon);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.showEndPopup("🏳️ Abandon confirmé.", false);
        }
      } catch (err) {
        console.error(err);
      }
    },

    showEndPopup(msg, isVictory = false) {
      this.popupMessage = msg;
      this.endPopup = true;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();
      this.turnTimer = 7;
      this.updateCircle();
    },

    enterSpectatorMode() {
      this.isSpectator = true;
      this.playerStatus = "dead";
      this.selectedCell = null;
    },

    async checkDefeat() {
      if (this.playerStatus !== "in_game") return;
      const shipCells = this.playerGrid.filter((c) => c.shipNumber > 0);
      if (!shipCells.length) return;
      const allDestroyed = shipCells.every((c) => c.status === "hit" || c.status === "sunk");
      if (!allDestroyed) return;

      this.playerStatus = "dead";
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/eliminate-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, reason: "shot" }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        if (data.finished) {
          const myTeamWon = this.isTeamMode
            ? data.winner_team === this.myTeamNumber
            : data.winner_id === this.user.id;

          let msg, isVic;
          if (data.is_draw) {
            msg = "⚖️ Égalité parfaite !";
            isVic = false;
          } else if (myTeamWon) {
            msg = "🏆 Victoire !";
            isVic = true;
          } else {
            msg = "💥 Défaite !";
            isVic = false;
          }
          this.claimReward(isVic);
          this.showEndPopup(msg, isVic);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.showEndPopup("💥 Tous vos bateaux sont coulés !", false);
        }
      } catch (err) {
        console.error(err);
      }
    },

    /* ----------------- Audio ----------------- */
    initAudio() {
      this.heartbeatAudio = new Audio(heartbeatSrc);
      this.heartbeatAudio.loop = true;
      this.heartbeatAudio.volume = 1;
    },
    playHeartbeat() {
      this.heartbeatAudio?.play().catch(() => {});
    },
    stopHeartbeat() {
      if (this.heartbeatAudio) {
        this.heartbeatAudio.pause();
        this.heartbeatAudio.currentTime = 0;
      }
    },
    updateHeartbeatSpeed() {
      if (!this.heartbeatAudio) return;
      const ships = {};
      this.playerGrid.forEach((cell) => {
        if (cell.shipNumber > 0 && cell.status !== "hit" && cell.status !== "sunk") {
          ships[cell.shipNumber] = true;
        }
      });
      this.heartbeatAudio.playbackRate = Object.keys(ships).length === 1 ? 2.0 : 1.0;
    },

    /* ----------------- Navigation ----------------- */
    goHome() {
      this.$router.push("/");
    },
  },
};
</script>
