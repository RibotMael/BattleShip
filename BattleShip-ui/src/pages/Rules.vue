<template>
  <div class="background rules-view" :style="backgroundStyle">
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
                  <span class="flag">
                    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                      <rect width="28" height="20" rx="3" fill="#f0f0f0" />
                      <rect width="9" height="20" fill="#002395" />
                      <rect x="19" width="9" height="20" fill="#ED2939" />
                    </svg>
                  </span>
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
                  <span class="flag">
                    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                      <rect width="28" height="20" rx="3" fill="#f0f0f0" />
                      <rect width="9" height="20" fill="#1E1E1E" />
                      <rect x="9" width="10" height="20" fill="#FFD90C" />
                      <rect x="19" width="9" height="20" fill="#E41E20" />
                    </svg>
                  </span>
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
              <h3>
                <span class="simple-icon">
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
                    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                    <path d="M13 19l6-6 2 2-6 6-2-2z" />
                    <path d="M2 21l3.5-3.5" />
                    <path d="M16 4l2-2 2 2-2 2-2-2z" />
                  </svg>
                </span>
                OBJECTIF
              </h3>
              <p>Éliminez l'intégralité de la flotte adverse pour sécuriser le secteur.</p>
            </section>
            <section class="cyber-card simple">
              <h3>
                <span class="simple-icon">
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
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </span>
                CARRIÈRE
              </h3>
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
/*  1. FOND & MISE EN PAGE GLOBALE  */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.background {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(3, 10, 16, 0.9), rgba(3, 10, 16, 0.95)),
    url("@/assets/Bataille_Navale_Assets-main/Background/Accueil.png");
  background-size: cover;
  background-position: center;
  font-family: "Inter", sans-serif;
  color: #dff2ee;
  z-index: 0;
}

.menu-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/*  2. BARRE DE NAVIGATION SUPÉRIEURE  */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  z-index: 100;
}

.btn-back-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.6rem 1.2rem;
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 8px;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-back-nav:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 15px rgba(29, 233, 192, 0.2);
  transform: translateX(-5px);
}

.page-title-badge {
  color: rgba(29, 233, 192, 0.5);
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(29, 233, 192, 0.2);
}

/*  3. CONTENU SCROLLABLE & TITRES  */
.content-scroll {
  flex: 1;
  padding: 0 20px 50px 20px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.1) transparent;
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
  margin: 0;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  text-shadow: 0 0 20px rgba(29, 233, 192, 0.3);
}

.title-underline {
  width: 60px;
  height: 4px;
  margin: 10px auto;
  background: #1de9c0;
}

/*  4. SECTIONS & GRILLES DE CARTES  */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 1.5rem;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.4rem;
  text-transform: uppercase;
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
  position: relative;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.cyber-card.highlight {
  background: rgba(29, 233, 192, 0.02);
  border-color: rgba(29, 233, 192, 0.3);
}

.cyber-card.simple h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  margin: 0;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

/*  5. LISTE DES VAISSEAUX & DÉTAILS  */
.spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.6;
  text-transform: uppercase;
}

.divider {
  height: 1px;
  margin: 12px 0;
  background: rgba(29, 233, 192, 0.1);
}

.ship-list {
  padding: 0;
  list-style: none;
}

.ship-list li {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-left: 12px;
  border-left: 2px solid rgba(29, 233, 192, 0.3);
  font-size: 0.9rem;
}

.size {
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
}

.card-footer {
  margin-top: 1.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/*  6. PROTOCOLES & BADGES  */
.protocol-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.protocol-item {
  display: flex;
  gap: 20px;
  padding: 1.2rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.protocol-item.active {
  background: rgba(29, 233, 192, 0.05);
  border-color: rgba(29, 233, 192, 0.2);
}

.step {
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
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
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
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

/*  7. SCROLLBAR PERSONNALISÉE  */
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
.content-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(29, 233, 192, 0.3);
}
</style>

<script>
import { userBus } from "@/eventBus.js";
import { watch } from "vue";

const backgroundImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

export default {
  data() {
    return {
      currentUser: JSON.parse(localStorage.getItem("user")) || null,
    };
  },
  computed: {
    backgroundStyle() {
      const folder = this.currentUser?.activeFondFolder ?? "";
      const key = folder ? `Accueil${folder}.png` : "Accueil.png";
      const img = backgroundImgs[key] || backgroundImgs["Accueil.png"] || "";
      return {
        backgroundImage: `linear-gradient(rgba(3, 10, 16, 0.85), rgba(3, 10, 16, 0.9)), url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    },
  },
  created() {
    watch(
      () => userBus.userUpdated,
      () => {
        this.currentUser = JSON.parse(localStorage.getItem("user")) || null;
      },
      { immediate: true },
    );
  },
};
</script>
