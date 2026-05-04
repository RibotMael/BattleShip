<!--JoinGame.vue-->
<template>
  <div class="background join-page" :style="backgroundStyle">
    <div class="join-container">
      <header class="page-header">
        <button class="btn-back-icon" @click="$router.push('/')">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M5 12L12 19M5 12L12 5" />
          </svg>
        </button>
        <h1 class="page-title">SALLES PUBLIQUES</h1>
        <div class="refresh-status">
          <span :class="['status-dot', { active: refreshing }]"></span>
          {{ refreshing ? "Mise à jour..." : "Live" }}
        </div>
      </header>

      <section class="filters-bar">
        <div class="filter-group">
          <label><span class="label-icon">🌍</span> LANGUE</label>
          <div class="select-wrapper">
            <select v-model="selectedLanguage" @change="applyFilters">
              <option value="">TOUTES</option>
              <option value="fr">FRANÇAIS</option>
              <option value="be">BELGE</option>
            </select>
          </div>
        </div>

        <div class="filter-group">
          <label><span class="label-icon">⚔️</span> MODE</label>
          <div class="select-wrapper">
            <select v-model="selectedMode" @change="applyFilters">
              <option value="">TOUS</option>
              <option value="1v1">1 vs 1</option>
              <option value="2v2">2 vs 2</option>
              <option value="3v3">3 vs 3</option>
              <option value="4v4">4 vs 4</option>
              <option value="battle-royale">BATTLE ROYALE</option>
            </select>
          </div>
        </div>
      </section>

      <main class="content-scroll">
        <div v-if="loading && publicGames.length === 0" class="state-msg">
          <div class="scanner-loader"></div>
          <p>SCAN DES FRÉQUENCES EN COURS...</p>
        </div>

        <div v-else-if="filteredGames.length === 0" class="state-msg">
          <p class="empty-txt">AUCUNE FLOTTE DÉTECTÉE AVEC CES PARAMÈTRES</p>
        </div>

        <div v-else class="games-grid">
          <div v-for="game in filteredGames" :key="game.ID_Game" class="game-card">
            <div class="card-header">
              <span class="game-id">#{{ game.ID_Game }}</span>
              <div class="player-count">
                <span class="icon">👥</span> {{ game.CurrentPlayers }}/{{ game.TotalPlayers }}
              </div>
            </div>

            <div class="card-body">
              <div class="info-row">
                <span class="info-label">COMMANDANT</span>
                <span class="info-value">{{ game.CreatorPseudo || "Inconnu" }}</span>
              </div>
              <div class="tag-row">
                <span class="badge mode-badge">{{ formatMode(game.TeamMode) }}</span>
                <span class="badge lang-badge">{{ game.Language === "fr" ? "FR" : "BE" }}</span>
              </div>
            </div>

            <button @click="joinGame(game.ID_Game)" class="btn-join">
              REJOINDRE
              <span class="btn-shine"></span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import api from "@/api/api.js";
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
      // --- Gestion des Parties ---
      publicGames: [],
      selectedLanguage: "",
      selectedMode: "",

      // --- États de Chargement ---
      loading: false,
      refreshing: false,

      // --- Utilisateur ---
      user: null,
      currentUser: JSON.parse(localStorage.getItem("user")) || null,

      // --- Utilitaires ---
      refreshInterval: null,
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
    filteredGames() {
      return this.publicGames
        .filter((game) => game.Status === "preparation")
        .filter((game) => game.TotalPlayers === null || game.CurrentPlayers < game.TotalPlayers)
        .filter((game) => !this.selectedLanguage || game.Language === this.selectedLanguage)
        .filter((game) => !this.selectedMode || game.TeamMode === this.selectedMode);
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
  mounted() {
    this.user = JSON.parse(localStorage.getItem("user"));
    this.fetchPublicGames();

    this.refreshInterval = setInterval(this.refreshPublicGames, 5000);
  },
  beforeUnmount() {
    clearInterval(this.refreshInterval);
  },
  methods: {
    async fetchPublicGames(isRefresh = false) {
      if (!isRefresh) this.loading = true;
      else this.refreshing = true;

      try {
        const res = await api.get("/games/public");
        if (res.data.success) {
          this.publicGames = res.data.games;
        }
      } catch (err) {
        // Mode silencieux
      } finally {
        this.loading = false;
        setTimeout(() => (this.refreshing = false), 500);
      }
    },

    async refreshPublicGames() {
      await this.fetchPublicGames(true);
    },

    async joinGame(gameId) {
      if (!this.user) {
        //alert("Vous devez être connecté pour rejoindre une partie.");
        return;
      }

      const playerId = Number(this.user.ID_Users || this.user.id);

      try {
        const res = await api.post(`/games/join/${gameId}`, { playerId });

        if (res.data.success) {
          localStorage.setItem("currentGame", JSON.stringify({ gameId, playerId }));
          this.$router.push({ name: "WaitingRoom", params: { gameId } });
        } else {
          //(res.data.message || "Impossible de rejoindre la partie.");
        }
      } catch (err) {
        //alert(err.response?.data?.message || "Erreur lors de la connexion.");
      }
    },

    formatMode(mode) {
      const modes = {
        "1v1": "1 vs 1",
        "2v2": "2 vs 2",
        "3v3": "3 vs 3",
        "4v4": "4 vs 4",
        "battle-royale": "Battle Royale",
      };
      return modes[mode] || mode;
    },
  },
};
</script>

<style scoped>
/* ── 1. IMPORT & CONTENEUR PRINCIPAL ── */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.join-container {
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  margin: auto;
  background: rgba(6, 18, 26, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* ── 2. HEADER DE LA PAGE ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(29, 233, 192, 0.1);
}

.page-title {
  margin: 0;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.btn-back-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 8px;
  color: #1de9c0;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back-icon:hover {
  background: rgba(29, 233, 192, 0.1);
  transform: translateX(-3px);
}

/* Statut du rafraîchissement */
.refresh-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2e6b62;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #2e6b62;
  border-radius: 50%;
}

.status-dot.active {
  background: #1de9c0;
  box-shadow: 0 0 10px #1de9c0;
  animation: pulse 1.5s infinite;
}

/* ── 3. FILTRES DE RECHERCHE ── */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
}

.label-icon {
  filter: grayscale(1) brightness(1.5);
}

/* Style des Selects */
.select-wrapper {
  padding: 2px 8px;
  background: rgba(0, 20, 30, 0.6);
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 6px;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}

.select-wrapper:focus-within {
  border-color: #1de9c0;
  box-shadow: 0 0 10px rgba(29, 233, 192, 0.2);
}

select {
  width: 100%;
  min-width: 140px;
  height: 35px;
  background: transparent;
  border: none;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  appearance: none;
}

select option {
  background-color: #06121a;
  color: #1de9c0;
  padding: 10px;
}

/* ── 4. GRILLE DES PARTIES & CARTES ── */
.content-scroll {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.2) transparent;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.game-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.game-card:hover {
  background: rgba(29, 233, 192, 0.04);
  border-color: rgba(29, 233, 192, 0.4);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-id {
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
}

.player-count {
  padding: 2px 8px;
  background: rgba(29, 233, 192, 0.1);
  border-radius: 4px;
  color: #dff2ee;
  font-size: 0.85rem;
}

/* Détails internes des cartes */
.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.info-label {
  color: #2e6b62;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
}

.info-value {
  color: #dff2ee;
  font-size: 0.95rem;
  font-weight: 500;
}

.tag-row {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
}

.mode-badge {
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.2);
}

.lang-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

/* ── 5. BOUTON D'ACTION ── */
.btn-join {
  position: relative;
  width: 100%;
  padding: 0.8rem;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 6px;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;
}

.btn-join:hover {
  background: #1de9c0;
  color: #030a10;
}

/* ── 6. MESSAGES D'ÉTAT & CHARGEMENT ── */
.state-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #2e6b62;
  font-family: "Rajdhani", sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.scanner-loader {
  width: 100px;
  height: 2px;
  margin-bottom: 20px;
  background: #1de9c0;
  box-shadow: 0 0 15px #1de9c0;
  animation: scan 2s ease-in-out infinite;
}

/* ── 7. ANIMATIONS & RESPONSIVE ── */
@keyframes scan {
  0%,
  100% {
    transform: scaleX(0.1);
    opacity: 0.2;
  }
  50% {
    transform: scaleX(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .join-container {
    width: 95%;
    height: 95vh;
  }
  .page-title {
    font-size: 1.1rem;
  }
  .filters-bar {
    gap: 1rem;
  }
}
</style>
