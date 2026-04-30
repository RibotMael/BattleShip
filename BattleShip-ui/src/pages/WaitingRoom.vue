<!--WaitingRoom.vue-->
<template>
  <div class="waiting-page" :style="backgroundStyle">
    <div class="room-container">
      <!-- ══ HEADER ══ -->
      <header class="hud-header">
        <div class="header-main">
          <div class="status-indicator animate-pulse"></div>
          <h1>
            SALLE D'ATTENTE
            <span class="session-id" v-if="game">#{{ game.ID_Game }}</span>
          </h1>
        </div>
        <div class="game-badge" v-if="game">
          <span class="mode-dot"></span>
          <span class="mode-text">{{ game.mode.replace("_", " ") }}</span>
        </div>
      </header>

      <!-- ══ GRID ══ -->
      <div class="hud-grid">
        <!-- Panneau amis -->
        <aside class="hud-panel friends-panel">
          <div class="panel-tag">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            UNITÉS DISPONIBLES
          </div>
          <div class="list-scroll">
            <div v-if="friends.length === 0" class="empty-msg">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                opacity=".4"
              >
                <circle cx="9" cy="7" r="4" />
                <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              AUCUNE UNITÉ EN LIGNE
            </div>
            <div v-for="friend in friends" :key="getUserId(friend)" class="friend-row">
              <div class="user-info">
                <span class="status-dot" :class="{ online: friend.isOnline }"></span>
                <span class="user-name">{{ friend.Pseudo || friend.pseudo }}</span>
              </div>
              <button
                class="btn-invite"
                @click="inviteFriend(getUserId(friend))"
                :disabled="!game?.ID_Game || isPlayerInGame(getUserId(friend))"
                :title="isPlayerInGame(getUserId(friend)) ? 'Déjà dans la partie' : 'Inviter'"
              >
                <svg
                  v-if="isPlayerInGame(getUserId(friend))"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <svg
                  v-else
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <!-- Panneau principal -->
        <main class="hud-panel main-panel">
          <div class="panel-tag">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            AFFECTATION DES TROUPES
          </div>

          <!-- MODE BATTLE ROYALE -->
          <div v-if="game?.mode === 'battle_royale'" class="br-layout">
            <div class="player-wall">
              <div v-for="player in playersWithMe" :key="getUserId(player)" class="player-tag">
                <span class="tag-avatar">{{
                  (player.Pseudo || player.pseudo || "?")[0].toUpperCase()
                }}</span>
                <span class="tag-name">{{ player.Pseudo || player.pseudo }}</span>
                <button
                  v-if="isHost && getUserId(player) !== userId"
                  @click="kickPlayer(getUserId(player))"
                  class="tag-kick"
                  title="Exclure"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- MODE CLASSIQUE -->
          <div v-else class="teams-layout">
            <!-- Joueurs non assignés -->
            <div v-if="unassignedPlayers.length > 0" class="unassigned-section">
              <div class="section-title">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                EN ATTENTE D'ORDRES
              </div>
              <div class="player-wall">
                <div
                  v-for="player in unassignedPlayers"
                  :key="getUserId(player)"
                  class="player-tag unassigned"
                >
                  <span class="tag-avatar">{{
                    (player.Pseudo || player.pseudo || "?")[0].toUpperCase()
                  }}</span>
                  <span class="tag-name">{{ player.Pseudo || player.pseudo }}</span>
                  <div class="tag-controls">
                    <button class="ctrl-btn t1-btn" @click="assignTeam(getUserId(player), 1)">
                      T1
                    </button>
                    <button class="ctrl-btn t2-btn" @click="assignTeam(getUserId(player), 2)">
                      T2
                    </button>
                    <button
                      v-if="isHost && getUserId(player) !== userId"
                      class="ctrl-btn kick-btn"
                      @click="kickPlayer(getUserId(player))"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grille équipes -->
            <div class="teams-grid">
              <div class="team-block t1">
                <div class="team-header">
                  <div class="team-color-bar t1-bar"></div>
                  ÉQUIPE ALPHA
                  <span class="team-count">{{ team1Players.length }}</span>
                </div>
                <div class="team-list">
                  <div v-if="team1Players.length === 0" class="team-empty">Aucun joueur</div>
                  <div v-for="player in team1Players" :key="getUserId(player)" class="member-row">
                    <div class="member-left">
                      <span class="member-avatar t1-avatar">{{
                        (player.Pseudo || player.pseudo || "?")[0].toUpperCase()
                      }}</span>
                      <span class="member-name">{{ player.Pseudo || player.pseudo }}</span>
                    </div>
                    <div class="member-actions">
                      <button
                        @click="assignTeam(getUserId(player), 2)"
                        class="btn-swap"
                        title="Changer d'équipe"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                          <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                      <button
                        @click="assignTeam(getUserId(player), null)"
                        class="btn-remove"
                        title="Retirer"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="team-block t2">
                <div class="team-header">
                  <div class="team-color-bar t2-bar"></div>
                  ÉQUIPE BETA
                  <span class="team-count">{{ team2Players.length }}</span>
                </div>
                <div class="team-list">
                  <div v-if="team2Players.length === 0" class="team-empty">Aucun joueur</div>
                  <div v-for="player in team2Players" :key="getUserId(player)" class="member-row">
                    <div class="member-left">
                      <span class="member-avatar t2-avatar">{{
                        (player.Pseudo || player.pseudo || "?")[0].toUpperCase()
                      }}</span>
                      <span class="member-name">{{ player.Pseudo || player.pseudo }}</span>
                    </div>
                    <div class="member-actions">
                      <button
                        @click="assignTeam(getUserId(player), 1)"
                        class="btn-swap"
                        title="Changer d'équipe"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                          <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                      <button
                        @click="assignTeam(getUserId(player), null)"
                        class="btn-remove"
                        title="Retirer"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          stroke-linecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <footer class="hud-footer">
            <div class="error-stack" v-if="isHost">
              <transition-group name="fade-error">
                <div v-if="hasNotEnoughPlayers" key="err1" class="hud-error">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  EFFECTIF INSUFFISANT
                </div>
                <div v-if="hasUnassignedPlayers" key="err2" class="hud-error">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  UNITÉS NON ASSIGNÉES
                </div>
                <div v-if="hasUnbalancedTeams" key="err3" class="hud-error">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  DÉSÉQUILIBRE DÉTECTÉ
                </div>
              </transition-group>
            </div>

            <div class="button-group">
              <button
                v-if="isHost"
                class="btn-cyber btn-primary"
                :disabled="!canStartGame"
                @click="startGame"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                ENGAGER LE COMBAT
              </button>
              <button @click="leaveRoom" class="btn-cyber btn-danger">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                ABANDONNER
              </button>
            </div>
            <p v-if="errorMsg" class="system-err">{{ errorMsg }}</p>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 1. CONFIGURATION & LAYOUT GLOBAL ── */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap");

.waiting-page {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-family: "Rajdhani", sans-serif;
  color: #dff2ee;
}

.room-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1100px;
  height: 85vh;
}

/* ── 2. HEADER (HUD) ── */
.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding: 14px 20px;
  background: rgba(6, 18, 26, 0.75);
  border: 1px solid rgba(29, 233, 192, 0.15);
  border-radius: 10px;
  backdrop-filter: blur(12px);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: #dff2ee;
}

.session-id {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(29, 233, 192, 0.45);
}

/* Indicateur de statut & Pulse */
.status-indicator {
  width: 10px;
  height: 10px;
  background: #1de9c0;
  border-radius: 50%;
  box-shadow: 0 0 8px #1de9c0;
  flex-shrink: 0;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Badge de mode de jeu */
.game-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: rgba(29, 233, 192, 0.08);
  border: 1px solid rgba(29, 233, 192, 0.25);
  border-radius: 6px;
}

.mode-dot {
  width: 6px;
  height: 6px;
  background: #1de9c0;
  border-radius: 50%;
}

.mode-text {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1de9c0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* ── 3. STRUCTURE DES PANNEAUX ── */
.hud-grid {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.hud-panel {
  display: flex;
  flex-direction: column;
  background: rgba(6, 18, 26, 0.8);
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.panel-tag {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 8px 16px;
  background: rgba(29, 233, 192, 0.08);
  border-bottom: 1px solid rgba(29, 233, 192, 0.1);
  color: #1de9c0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.5px;
}

/* ── 4. PANNEAU LATÉRAL (AMIS / CONTACTS) ── */
.friends-panel {
  width: 260px;
  flex-shrink: 0;
}

.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.15) transparent;
}

.list-scroll::-webkit-scrollbar {
  width: 3px;
}
.list-scroll::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.15);
  border-radius: 2px;
}

.friend-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
  padding: 9px 10px;
  border-radius: 6px;
  transition: background 0.18s;
}

.friend-row:hover {
  background: rgba(29, 233, 192, 0.05);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 9px;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a8cdc7;
}

.status-dot {
  width: 7px;
  height: 7px;
  background: rgba(74, 85, 104, 0.6);
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #1de9c0;
  box-shadow: 0 0 6px rgba(29, 233, 192, 0.7);
}

.btn-invite {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 5px;
  color: #1de9c0;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s,
    transform 0.12s;
}

.btn-invite:hover:not(:disabled) {
  background: #1de9c0;
  color: #030a10;
  transform: scale(1.08);
}

.btn-invite:disabled {
  background: rgba(29, 233, 192, 0.06);
  border-color: rgba(29, 233, 192, 0.1);
  color: rgba(29, 233, 192, 0.35);
  cursor: not-allowed;
}

.empty-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 0;
  color: #1e4e49;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
}

/* ── 5. PANNEAU CENTRAL (ÉQUIPES / JOUEURS) ── */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.teams-layout,
.br-layout {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.1) transparent;
}

.unassigned-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: rgba(29, 233, 192, 0.55);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.5px;
}

/* ── 6. TAGS JOUEURS & CONTRÔLES ── */
.player-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.player-tag {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
  transition: border-color 0.15s;
}

.player-tag:hover {
  border-color: rgba(29, 233, 192, 0.2);
}

.player-tag.unassigned {
  background: rgba(29, 233, 192, 0.03);
  border-color: rgba(29, 233, 192, 0.2);
}

.tag-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(29, 233, 192, 0.15);
  border-radius: 5px;
  color: #1de9c0;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.tag-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #c0ddd8;
}

.tag-controls {
  display: flex;
  gap: 4px;
  margin-left: 0; /* Ajusté par rapport à l'original si besoin */
  padding-left: 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
}

/* Boutons de gestion (Kick/Team) */
.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.t1-btn {
  background: rgba(29, 233, 192, 0.08);
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
}
.t1-btn:hover {
  background: rgba(29, 233, 192, 0.2);
}

.t2-btn {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}
.t2-btn:hover {
  background: rgba(56, 189, 248, 0.2);
}

.kick-btn {
  min-width: 24px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.25);
  color: #f87171;
}
.kick-btn:hover {
  background: rgba(248, 113, 113, 0.2);
}

.tag-kick {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 4px;
  color: #f87171;
  cursor: pointer;
  transition: background 0.15s;
}
.tag-kick:hover {
  background: rgba(248, 113, 113, 0.15);
}

/* ── 7. GRILLE DES ÉQUIPES (TEAM MODE) ── */
.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 4px;
}

.team-block {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.team-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 2px;
}

.team-color-bar {
  width: 3px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}
.t1-bar {
  background: #1de9c0;
}
.t2-bar {
  background: #38bdf8;
}

.team-count {
  margin-left: auto;
  padding: 1px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #5a8a82;
  font-size: 0.65rem;
}

.team-list {
  padding: 8px;
  min-height: 60px;
}

.team-empty {
  padding: 16px;
  text-align: center;
  color: #1e4e49;
  font-size: 0.7rem;
  letter-spacing: 1px;
}

/* Ligne de membre d'équipe */
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
  padding: 7px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.member-row:hover {
  background: rgba(255, 255, 255, 0.03);
}

.member-left {
  display: flex;
  align-items: center;
  gap: 9px;
}

.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.t1-avatar {
  background: rgba(29, 233, 192, 0.12);
  color: #1de9c0;
}
.t2-avatar {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.member-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a8cdc7;
}

.member-actions {
  display: flex;
  gap: 4px;
}

.btn-swap,
.btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-swap {
  background: rgba(29, 233, 192, 0.06);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
}
.btn-swap:hover {
  background: rgba(29, 233, 192, 0.15);
}

.btn-remove {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.3);
}
.btn-remove:hover {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.3);
  color: #f87171;
}

/* ── 8. FOOTER & MESSAGES D'ERREUR ── */
.hud-footer {
  flex-shrink: 0;
  padding: 16px 20px;
  background: rgba(3, 10, 16, 0.4);
  border-top: 1px solid rgba(29, 233, 192, 0.08);
}

.error-stack {
  margin-bottom: 12px;
}

.hud-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
  color: #f87171;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.system-err {
  margin-top: 8px;
  text-align: center;
  color: #f87171;
  font-size: 0.78rem;
}

/* ── 9. BOUTONS D'ACTION (CYBER) ── */
.button-group {
  display: flex;
  gap: 12px;
}

.btn-cyber {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px 22px;
  border: none;
  border-radius: 7px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s;
}

.btn-primary {
  flex: 2;
  background: #1de9c0;
  color: #030a10;
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #14d4ae;
  box-shadow: 0 0 30px rgba(29, 233, 192, 0.35);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: rgba(29, 233, 192, 0.1);
  color: #1e5e55;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-danger {
  flex: 1;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
}

.btn-danger:hover {
  background: rgba(248, 113, 113, 0.15);
  border-color: #f87171;
  transform: translateY(-1px);
}

/* ── 10. ANIMATIONS & TRANSITIONS (Vue) ── */
.fade-error-enter-active,
.fade-error-leave-active {
  transition: all 0.25s ease;
}

.fade-error-enter-from,
.fade-error-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* ── 11. RESPONSIVE (TABLETTES & MOBILES) ── */
@media (max-width: 900px) {
  .hud-grid {
    flex-direction: column;
  }

  .friends-panel {
    width: 100%;
    height: 170px;
    flex-shrink: 0;
  }

  .teams-grid {
    grid-template-columns: 1fr;
  }

  .room-container {
    height: 95vh;
  }
}
</style>

<script>
import api from "@/api/api.js";
import socket from "../services/socket.js";
import { userBus } from "@/eventBus.js";
import { watch } from "vue";

const backgroundImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

export default {
  props: { gameId: { type: [String, Number], required: false } },
  data() {
    return {
      localGameId: null,
      game: null,
      players: [],
      user: JSON.parse(localStorage.getItem("user")) || { id: 999, pseudo: "TestUser" },
      userId: 0,
      friends: [],
      isHost: false,
      polling: null,
      errorMsg: "",
      teamAssignments: {},
      currentUser: JSON.parse(localStorage.getItem("user")) || null,
    };
  },
  computed: {
    backgroundStyle() {
      const folder = this.currentUser?.activeFondFolder ?? "";
      const key = folder ? `Accueil${folder}.png` : "Accueil.png";
      const img = backgroundImgs[key] || backgroundImgs["Accueil.png"] || "";
      return {
        backgroundImage: `linear-gradient(rgba(3, 10, 16, 0.88), rgba(3, 10, 16, 0.92)), url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    },
    playersWithMe() {
      const allPlayers = Array.isArray(this.players) ? this.players : [];
      if (allPlayers.length === 0 && this.userId) {
        return [{ ID_Users: this.userId, Pseudo: this.user?.pseudo || "Moi" }];
      }
      return allPlayers;
    },
    playersPerTeam() {
      return this.game?.TotalPlayers ? this.game.TotalPlayers / 2 : 0;
    },
    unassignedPlayers() {
      return this.playersWithMe.filter((p) => !this.teamAssignments[this.getUserId(p)]);
    },
    team1Players() {
      return this.playersWithMe.filter(
        (p) => Number(this.teamAssignments[this.getUserId(p)]) === 1,
      );
    },
    team2Players() {
      return this.playersWithMe.filter(
        (p) => Number(this.teamAssignments[this.getUserId(p)]) === 2,
      );
    },
    canStartGame() {
      if (!this.game || !this.isHost) return false;
      if (this.game.mode === "battle_royale") return this.playersWithMe.length >= 2;
      const req = this.playersPerTeam;
      return this.team1Players.length === req && this.team2Players.length === req;
    },
    hasNotEnoughPlayers() {
      if (!this.game) return false;
      if (this.game.mode === "battle_royale") return this.playersWithMe.length < 2;
      return this.playersWithMe.length < (this.game.TotalPlayers || 2);
    },
    hasUnassignedPlayers() {
      if (!this.game) return false;
      return this.game.mode !== "battle_royale" && this.unassignedPlayers.length > 0;
    },
    hasUnbalancedTeams() {
      if (!this.game || this.game.mode === "battle_royale") return false;
      if (this.hasNotEnoughPlayers || this.hasUnassignedPlayers) return false;
      return (
        this.team1Players.length !== this.playersPerTeam ||
        this.team2Players.length !== this.playersPerTeam
      );
    },
  },

  // ── created() UNIQUE — fusion du watcher background + init sockets ──
  async created() {
    // Watcher background
    watch(
      () => userBus.userUpdated,
      () => {
        this.currentUser = JSON.parse(localStorage.getItem("user")) || null;
      },
      { immediate: true },
    );

    // Init
    this.userId = Number(this.user.id || this.user.ID_Users || 999);
    this.localGameId = this.gameId || this.$route.params.gameId;
    await this.initRoom();

    // Sockets
    socket.emit("register-user", { userId: this.userId });
    socket.emit("join-room", this.localGameId);
    socket.on("friend-status-change", ({ userId, isOnline }) => {
      const f = this.friends.find((fr) => Number(this.getUserId(fr)) === Number(userId));
      if (f) f.isOnline = isOnline;
    });
    socket.on("player-kicked", ({ playerId }) => {
      if (Number(playerId) === this.userId) this.$router.push("/gamemode");
      else this.fetchGame();
    });
    socket.on("room-closed", () => {
      this.exitDueToClosure("La salle a été fermée par l'hôte.");
    });
  },

  beforeUnmount() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    socket.emit("leave-room", this.localGameId);
    clearInterval(this.polling);
    socket.off("friend-status-change");
    socket.off("player-kicked");
    socket.off("room-closed");
  },

  methods: {
    getUserId(obj) {
      if (!obj) return null;
      return Number(obj.ID_Users || obj.id_users || obj.id || obj.id_player || obj.ID);
    },
    isPlayerInGame(id) {
      return this.playersWithMe.some((p) => Number(this.getUserId(p)) === Number(id));
    },
    async fetchFriends() {
      try {
        const res = await api.get(`/friends/list/${this.userId}`);
        const data = Array.isArray(res.data) ? res.data : res.data.friends || [];
        this.friends = data.map((f) => ({ ...f, isOnline: false }));
        socket.emit("get_online_friends");
      } catch {
        this.friends = [];
      }
    },
    async fetchGame() {
      try {
        const res = await api.get(`/games/${this.localGameId}`);
        const data = res.data;
        if (!data.success) {
          this.exitDueToClosure();
          return false;
        }

        const g = data.game;
        this.game = {
          ID_Game: g.id_Game || g.ID_Game,
          id_creator: g.id_creator || g.ID_Creator,
          status: g.status,
          mode: Number(g.id_game_type) === 1 ? "battle_royale" : "classic",
          TotalPlayers: g.TotalPlayers || 2,
        };
        this.players = Array.isArray(data.players) ? data.players : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);

        if (!this.isHost) {
          const stillPresent = this.players.some(
            (p) => Number(this.getUserId(p)) === Number(this.userId),
          );
          if (!stillPresent) {
            this.exitDueToClosure("Vous avez été exclu de la salle.");
            return false;
          }
        }

        const newAssign = {};
        this.players.forEach((p) => {
          const pId = this.getUserId(p);
          if (p.team_number !== undefined && p.team_number !== null) {
            newAssign[pId] = Number(p.team_number);
          }
        });
        this.teamAssignments = newAssign;

        if (this.game.status === "placement") {
          this.$router.replace({ name: "PlaceShips", params: { gameId: this.game.ID_Game } });
        }
        return true;
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 410) {
          this.exitDueToClosure("La salle a été fermée par l'hôte.");
        }
        return false;
      }
    },
    async initRoom() {
      await this.fetchGame();
      await this.fetchFriends();
      this.setupPolling();
    },
    setupPolling() {
      if (this.polling) clearInterval(this.polling);
      this.polling = setInterval(() => this.fetchGame(), 3000);
    },
    async inviteFriend(friendId) {
      if (!this.game?.ID_Game || !friendId) {
        this.errorMsg = "Données d'invitation manquantes.";
        return;
      }
      try {
        await api.post("/invitation", {
          gameId: Number(this.game.ID_Game),
          senderId: Number(this.userId),
          receiverId: Number(friendId),
        });
      } catch {
        this.errorMsg = "Impossible de joindre le service d'invitation.";
      }
    },
    async assignTeam(playerId, team) {
      try {
        await api.post("/games/assign-team", {
          gameId: Number(this.game.ID_Game),
          playerId: Number(playerId),
          team,
        });
        await this.fetchGame();
      } catch {
        this.errorMsg = "Erreur lors du changement d'équipe.";
      }
    },
    async leaveRoom() {
      try {
        await api.post("/games/leave", { gameId: this.game.ID_Game, playerId: this.userId });
        this.$router.push("/gamemode");
      } catch {}
    },
    async kickPlayer(playerId) {
      if (this.getUserId({ id: playerId }) === this.userId) return;
      if (!confirm("Voulez-vous vraiment exclure ce joueur ?")) return;
      try {
        await api.post("/games/kick", {
          gameId: this.game.ID_Game,
          hostId: Number(this.userId),
          targetPlayerId: Number(playerId),
        });
        await this.fetchGame();
      } catch {}
    },
    async inviteAllFriends() {
      const onlineFriends = this.friends.filter(
        (f) => f.isOnline && !this.isPlayerInGame(this.getUserId(f)),
      );
      for (const friend of onlineFriends) await this.inviteFriend(this.getUserId(friend));
    },
    async startGame() {
      try {
        await api.post("/games/start", {
          gameId: this.game.ID_Game,
          userId: this.userId,
          teams: this.teamAssignments,
        });
      } catch {
        this.errorMsg = "Erreur démarrage.";
      }
    },
    exitDueToClosure(reason = "Salle fermée.") {
      clearInterval(this.polling);
      this.$router.push("/gamemode");
    },
  },
};
</script>
