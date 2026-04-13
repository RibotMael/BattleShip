<template>
  <div class="background rules-view">
    <div class="menu-container">
      <header class="top-bar">
        <div class="left-section">
          <button @click="$router.push('/')" class="btn-back-nav">
            <span class="icon-wrap">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M19 12H5M5 12L12 19M5 12L12 5" />
              </svg>
            </span>
            <span class="btn-label">QUARTIER GÉNÉRAL</span>
          </button>
        </div>
        <div class="right-section">
          <div class="page-title-badge">ARCHIVES TACTIQUES</div>
        </div>
      </header>

      <main class="content-scroll">
        <div class="rules-wrapper">
          <div class="logo-container-small">
            <h1 class="cyber-title">RÈGLES D'ENGAGEMENT</h1>
            <div class="title-underline"></div>
          </div>

          <section class="cyber-section">
            <h2 class="section-header"><span class="accent-text">01.</span> MODES RÉGIONAUX</h2>
            <div class="grid-2-cols">
              <div class="cyber-card">
                <div class="card-header">
                  <span class="flag">🇫🇷</span>
                  <h3>MODE FRANÇAIS</h3>
                </div>
                <div class="card-body">
                  <div class="spec-row">
                    <span>GRILLE</span> <span class="val">10x10 (A-J)</span>
                  </div>
                  <div class="divider"></div>
                  <ul class="ship-list">
                    <li>Porte-avions <span class="size">5c</span></li>
                    <li>Croiseur <span class="size">4c</span></li>
                    <li>Contre-torpilleurs (x2) <span class="size">3c</span></li>
                    <li>Torpilleur <span class="size">2c</span></li>
                  </ul>
                </div>
                <div class="card-footer">DOCTRINE OFFENSIVE</div>
              </div>

              <div class="cyber-card highlight">
                <div class="card-header">
                  <span class="flag">🇧🇪</span>
                  <h3>MODE BELGE</h3>
                </div>
                <div class="card-body">
                  <div class="spec-row">
                    <span>GRILLE</span> <span class="val">10x10 (A-J)</span>
                  </div>
                  <div class="divider"></div>
                  <ul class="ship-list">
                    <li>Cuirassé <span class="size">4c</span></li>
                    <li>Croiseurs (x2) <span class="size">3c</span></li>
                    <li>Torpilleurs (x3) <span class="size">2c</span></li>
                    <li>Sous-marins (x4) <span class="size">1c</span></li>
                  </ul>
                </div>
                <div class="card-footer">NAVIRES ADJACENTS AUTORISÉS</div>
              </div>
            </div>
          </section>

          <div class="grid-2-cols">
            <section class="cyber-card simple">
              <h3>⚔️ OBJECTIF</h3>
              <p>Éliminez l'intégralité de la flotte adverse pour sécuriser le secteur.</p>
            </section>
            <section class="cyber-card simple">
              <h3>📈 CARRIÈRE</h3>
              <p>
                Chaque tir et chaque victoire augmentent votre
                <span class="accent-text">XP</span> et votre réserve d'<span class="gold-text"
                  >OR</span
                >.
              </p>
            </section>
          </div>

          <section class="cyber-section">
            <h2 class="section-header">
              <span class="accent-text">02.</span> DÉROULEMENT DU COMBAT
            </h2>
            <div class="protocol-list">
              <div class="protocol-item">
                <div class="step">STP_01</div>
                <div class="text">
                  <strong>PLACEMENT :</strong> Déploiement secret. Les navires ne doivent pas se
                  toucher (sauf doctrine Belge).
                </div>
              </div>
              <div class="protocol-item active">
                <div class="step">STP_02</div>
                <div class="text">
                  <strong>FENÊTRE DE TIR :</strong> Vous disposez de
                  <span class="timer-text">7 SECONDES</span>. Passé ce délai, l'IA effectue un tir
                  de barrage aléatoire.
                </div>
              </div>
              <div class="protocol-item">
                <div class="step">STP_03</div>
                <div class="text">
                  <strong>RAPPORTS RADAR :</strong>
                  <div class="badge-group">
                    <span class="badge splash">À L'EAU</span>
                    <span class="badge hit">TOUCHÉ</span>
                    <span class="badge sunk">COULÉ</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.background {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(3, 10, 16, 0.9), rgba(3, 10, 16, 0.95)),
    url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  font-family: "Inter", sans-serif;
  color: #dff2ee;
}

.menu-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* --- TOP BAR (COHÉRENT AVEC ACCUEIL) --- */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  z-index: 100;
}

.btn-back-nav {
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  transition: all 0.2s;
}

.btn-back-nav:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 15px rgba(29, 233, 192, 0.2);
}

.page-title-badge {
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  color: rgba(29, 233, 192, 0.5);
  letter-spacing: 2px;
  border-bottom: 1px solid rgba(29, 233, 192, 0.2);
}

/* --- CONTENT SCROLL --- */
.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 50px 20px;
}

.rules-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

.logo-container-small {
  text-align: center;
  margin-bottom: 3rem;
}

.cyber-title {
  font-family: "Rajdhani", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1de9c0;
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(29, 233, 192, 0.3);
}

.title-underline {
  width: 60px;
  height: 4px;
  background: #1de9c0;
  margin: 10px auto;
}

/* --- CYBER CARDS & SECTIONS --- */
.section-header {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.accent-text {
  color: #1de9c0;
}
.gold-text {
  color: #f59e0b;
}

.grid-2-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.cyber-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  transition: transform 0.3s;
}

.cyber-card.highlight {
  border-color: rgba(29, 233, 192, 0.3);
  background: rgba(29, 233, 192, 0.02);
}

.cyber-card.simple h3 {
  font-family: "Rajdhani", sans-serif;
  color: #1de9c0;
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.6;
}

.divider {
  height: 1px;
  background: rgba(29, 233, 192, 0.1);
  margin: 12px 0;
}

.ship-list {
  list-style: none;
  padding: 0;
}

.ship-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 8px;
  padding-left: 12px;
  border-left: 2px solid rgba(29, 233, 192, 0.3);
}

.size {
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  color: #1de9c0;
}

.card-footer {
  margin-top: 1.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
  letter-spacing: 2px;
  opacity: 0.4;
  text-transform: uppercase;
}

/* --- PROTOCOL ITEMS --- */
.protocol-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.protocol-item {
  display: flex;
  gap: 20px;
  background: rgba(255, 255, 255, 0.02);
  padding: 1.2rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.protocol-item.active {
  border-color: rgba(29, 233, 192, 0.2);
  background: rgba(29, 233, 192, 0.05);
}

.step {
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  color: #1de9c0;
  font-size: 0.8rem;
  opacity: 0.5;
}

.timer-text {
  color: #f87171;
  font-weight: bold;
}

.badge-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  font-family: "Rajdhani", sans-serif;
}

.splash {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}
.hit {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}
.sunk {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

/* Scrollbar Style Custom */
.content-scroll::-webkit-scrollbar {
  width: 6px;
}
.content-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.content-scroll::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.1);
  border-radius: 10px;
}
</style>
