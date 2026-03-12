<template>
  <div class="rules-container">
    <div class="content-wrapper">
      <header class="rules-header">
        <h1>⚓ Règles du jeu – BattleShip</h1>
        <p class="subtitle">Préparez votre flotte, commandant.</p>
      </header>

      <section class="rules-section">
        <div class="section-header">
          <h2>🌐 Modes de langue & variantes</h2>
          <p>
            Lors de la connexion, chaque joueur choisit un
            <strong class="highlight">mode régional</strong>, qui influence les
            <strong>règles navales</strong> et la <strong>flotte</strong> :
          </p>
        </div>

        <div class="grid-2-cols">
          <div class="card regional-card">
            <h3>🇫🇷 Mode Français</h3>
            <div class="grid-info">
              <span class="badge">Grille 10x10</span>
              <span class="badge">A–J / 1–10</span>
            </div>
            <h4>Flotte (5 navires) :</h4>
            <ul>
              <li><strong>1 Porte-avions</strong> <span class="size-badge">5 cases</span></li>
              <li><strong>1 Croiseur</strong> <span class="size-badge">4 cases</span></li>
              <li><strong>2 Contre-torpilleurs</strong> <span class="size-badge">3 cases</span></li>
              <li><strong>1 Torpilleur</strong> <span class="size-badge">2 cases</span></li>
            </ul>
          </div>

          <div class="card regional-card">
            <h3>🇧🇪 Mode Belge</h3>
            <div class="grid-info">
              <span class="badge">Grille 10x10</span>
              <span class="badge">A–J / 1–10</span>
            </div>
            <h4>Flotte (10 navires) :</h4>
            <ul>
              <li><strong>1 Cuirassé</strong> <span class="size-badge">4 cases</span></li>
              <li><strong>2 Croiseurs</strong> <span class="size-badge">3 cases</span></li>
              <li><strong>3 Torpilleurs</strong> <span class="size-badge">2 cases</span></li>
              <li><strong>4 Sous-marins</strong> <span class="size-badge">1 case</span></li>
            </ul>
          </div>
        </div>
      </section>

      <div class="grid-2-cols">
        <section class="card rules-section">
          <h2>⚔️ Objectif du jeu</h2>
          <p>
            Être le dernier joueur (ou équipe) avec des bateaux à flot en coulant l’intégralité de
            la flotte ennemie.
          </p>
        </section>

        <section class="card rules-section">
          <h2>📊 Victoires & Défaites</h2>
          <p>Votre profil enregistre vos performances :</p>
          <ul>
            <li><strong class="success">Victoire</strong> : Le compteur augmente.</li>
            <li><strong class="danger">Défaite</strong> : Le compteur augmente.</li>
          </ul>
        </section>
      </div>

      <section class="card rules-section">
        <h2>🎮 Modes de jeu</h2>
        <div class="modes-grid">
          <div class="mode-item">
            <span class="mode-icon">⚔️</span>
            <strong>1 vs 1</strong>
            <span>Duel classique</span>
          </div>
          <div class="mode-item">
            <span class="mode-icon">🤝</span>
            <strong>2 vs 2</strong>
            <span>Coopération par équipe</span>
          </div>
          <div class="mode-item">
            <span class="mode-icon">🔥</span>
            <strong>3 vs 3 <br />4 vs 4</strong>
            <span>Guerre totale par équipe</span>
          </div>
          <div class="mode-item">
            <span class="mode-icon">👑</span>
            <strong>Battle Royale</strong>
            <span>Seul contre tous</span>
          </div>
        </div>
      </section>

      <section class="card rules-section">
        <h2>🧩 Déroulement d’une partie</h2>
        <ul class="timeline-list">
          <li>
            <strong>Placement des navires :</strong> Chaque joueur place ses navires secrètement.
            <em class="warning">Les navires ne peuvent pas se toucher (sauf en mode belge).</em>
          </li>
          <li>
            <strong>Tour de jeu (Timer) :</strong> Vous avez
            <strong class="highlight">7 secondes</strong> pour tirer. Passé ce délai, un tir
            aléatoire est effectué !
          </li>
          <li>
            <strong>Résultat du tir :</strong>
            <div class="hit-results">
              <span class="hit-badge miss">💦 À l'eau</span>
              <span class="hit-badge hit">💥 Touché</span>
              <span class="hit-badge sunk">☠️ Touché-coulé</span>
            </div>
          </li>
          <li>
            <strong>Fin de partie :</strong> Déclenchée dès qu’il reste un joueur ou une équipe en
            vie.
          </li>
        </ul>
      </section>

      <section class="card rules-section">
        <h2>🔍 Rejoindre ou créer</h2>
        <ul>
          <li>
            <strong>Accès rapide</strong> : Rejoignez directement une partie selon la langue et le
            mode.
          </li>
          <li><strong>Création</strong> : Créer votre propre partie (public/privé, mode).</li>
        </ul>
      </section>

      <button @click="$router.push('/')" class="back-button">
        <span class="icon">⬅</span> Retour au quartier général
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Conteneur principal */
.rules-container {
  background: radial-gradient(circle at top, #0a2540 0%, #001220 100%);
  color: #e2e8f0;
  min-height: 100vh;
  padding: 3rem 1.5rem;
  display: flex;
  justify-content: center;
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
  line-height: 1.6;
}

.content-wrapper {
  max-width: 850px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* En-tête */
.rules-header {
  text-align: center;
  margin-bottom: 1rem;
}

.rules-header h1 {
  font-size: 2.8rem;
  color: #ffffff;
  margin-bottom: 0.5rem;
  text-shadow: 0 4px 15px rgba(0, 163, 255, 0.4);
}

.subtitle {
  color: #94a3b8;
  font-size: 1.2rem;
  font-style: italic;
}

/* Typographie & Couleurs */
h2 {
  font-size: 1.6rem;
  color: #38bdf8;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

h3 {
  font-size: 1.3rem;
  color: #fcd34d;
  margin-bottom: 1rem;
}

h4 {
  font-size: 1.1rem;
  color: #cbd5e1;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

/* Cartes (Glassmorphism) */
.card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

/* Grilles de layout */
.grid-2-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.mode-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mode-icon {
  font-size: 1.8rem;
}

.mode-item span:last-child {
  font-size: 0.85rem;
  color: #94a3b8;
}

/* Listes */
ul {
  list-style: none;
  padding: 0;
}

ul:not(.timeline-list) li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

ul:not(.timeline-list) li::before {
  content: "»";
  position: absolute;
  left: 0;
  color: #38bdf8;
  font-weight: bold;
}

.timeline-list li {
  margin-bottom: 1.2rem;
  padding-bottom: 1.2rem;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
}
.timeline-list li:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

/* Badges & Textes stylisés */
.badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
}

.size-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  float: right;
  color: #cbd5e1;
}

.grid-info {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.highlight {
  color: #fcd34d;
}

.warning {
  color: #fb923c;
  font-size: 0.9rem;
}

.success {
  color: #4ade80;
}
.danger {
  color: #f87171;
}

.hit-results {
  display: flex;
  gap: 1rem;
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.hit-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}
.hit-badge.miss {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid #38bdf8;
}
.hit-badge.hit {
  background: rgba(250, 204, 21, 0.2);
  border: 1px solid #facc15;
}
.hit-badge.sunk {
  background: rgba(248, 113, 113, 0.2);
  border: 1px solid #f87171;
}

/* Bouton Retour */
.back-button {
  align-self: center;
  margin-top: 1rem;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.6);
  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
}

/* Responsive design */
@media (max-width: 600px) {
  .rules-container {
    padding: 1.5rem 1rem;
  }
  .rules-header h1 {
    font-size: 2rem;
  }
  .hit-results {
    flex-direction: column;
    gap: 0.5rem;
  }
  .card {
    padding: 1.5rem;
  }
}
</style>
