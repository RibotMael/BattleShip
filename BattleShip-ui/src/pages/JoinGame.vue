<!--JoinGame.vue-->
<template>
  <div class="background join-page">
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

export default {
  data() {
    return {
      publicGames: [],
      loading: false,
      refreshing: false,
      user: null,
      refreshInterval: null,
      selectedLanguage: "",
      selectedMode: "",
    };
  },
  computed: {
    filteredGames() {
      return this.publicGames
        .filter((game) => game.Status === "preparation")
        .filter((game) => game.TotalPlayers === null || game.CurrentPlayers < game.TotalPlayers)
        .filter((game) => !this.selectedLanguage || game.Language === this.selectedLanguage)
        .filter((game) => !this.selectedMode || game.TeamMode === this.selectedMode);
    },
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
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.background {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(3, 10, 16, 0.85), rgba(3, 10, 16, 0.9)),
    url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  font-family: "Inter", sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

.join-container {
  width: 90%;
  max-width: 1000px;
  height: 85vh;
  background: rgba(6, 18, 26, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

/* ── HEADER ── */
.page-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(29, 233, 192, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-family: "Rajdhani", sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: #1de9c0;
  margin: 0;
}

.btn-back-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back-icon:hover {
  background: rgba(29, 233, 192, 0.1);
  transform: translateX(-3px);
}

.refresh-status {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: #2e6b62;
  display: flex;
  align-items: center;
  gap: 8px;
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

/* ── FILTRES ── */
.filters-bar {
  padding: 1.25rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #2e6b62;
  letter-spacing: 0.1em;
}

/* --- Correction des Filtres (Select) --- */

.select-wrapper {
  background: rgba(0, 20, 30, 0.6); /* Fond très sombre pour le contraste */
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 6px;
  padding: 2px 8px;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}

.select-wrapper:focus-within {
  border-color: #1de9c0;
  box-shadow: 0 0 10px rgba(29, 233, 192, 0.2);
}

select {
  background: transparent;
  border: none;
  color: #1de9c0; /* Texte turquoise */
  font-family: "Rajdhani", sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  min-width: 140px;
  height: 35px;
  appearance: none; /* Supprime le style natif OS */
}

/* Style des options (la liste qui s'ouvre) */
select option {
  background-color: #06121a; /* Fond sombre forcé */
  color: #1de9c0; /* Texte turquoise */
  padding: 10px;
}

/* Pour Firefox/Chrome sur certains OS, on s'assure que le texte n'est pas blanc */
select:focus {
  color: #1de9c0;
}

.filter-group label {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: #1de9c0; /* Label turquoise pour plus de visibilité */
  letter-spacing: 0.15em;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.label-icon {
  filter: grayscale(1) brightness(1.5); /* Rend l'emoji plus discret/tech */
}
/* ── GRID & CARDS ── */
.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 233, 192, 0.2) transparent;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.game-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  color: #1de9c0;
  font-size: 1.1rem;
}

.player-count {
  font-size: 0.85rem;
  color: #dff2ee;
  background: rgba(29, 233, 192, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.info-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.info-label {
  font-size: 0.6rem;
  color: #2e6b62;
  font-weight: 700;
  text-transform: uppercase;
}

.info-value {
  color: #dff2ee;
  font-weight: 500;
  font-size: 0.95rem;
}

.tag-row {
  display: flex;
  gap: 8px;
}

.badge {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
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

.btn-join {
  width: 100%;
  padding: 0.8rem;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.btn-join:hover {
  background: #1de9c0;
  color: #030a10;
}

/* ── MESSAGES D'ÉTAT ── */
.state-msg {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #2e6b62;
  font-family: "Rajdhani", sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.scanner-loader {
  width: 100px;
  height: 2px;
  background: #1de9c0;
  box-shadow: 0 0 15px #1de9c0;
  margin-bottom: 20px;
  animation: scan 2s ease-in-out infinite;
}

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

/* Responsive */
@media (max-width: 600px) {
  .filters-bar {
    gap: 1rem;
  }
  .page-title {
    font-size: 1.1rem;
  }
  .join-container {
    height: 95vh;
    width: 95%;
  }
}
</style>
