<!--JoinGame.vue-->
<template>
  <div class="join-game-container">
    <h1>🔍 Rejoindre une partie publique</h1>

    <!-- 🧭 Filtres -->
    <div class="filters">
      <div class="filter-group">
        <label for="language">🌍 Langue :</label>
        <select id="language" v-model="selectedLanguage" @change="applyFilters">
          <option value="">Toutes</option>
          <option value="fr">Français</option>
          <option value="be">Belge</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="mode">⚔️ Mode :</label>
        <select id="mode" v-model="selectedMode" @change="applyFilters">
          <option value="">Tous</option>
          <option value="1v1">1 vs 1</option>
          <option value="2v2">2 vs 2</option>
          <option value="3v3">3 vs 3</option>
          <option value="4v4">4 vs 4</option>
          <option value="battle-royale">Battle Royale</option>
        </select>
      </div>
    </div>

    <!-- 💾 Contenu -->
    <div v-if="loading && publicGames.length === 0" class="loading">Chargement des parties...</div>

    <div v-else>
      <div v-if="filteredGames.length === 0" class="empty">
        😔 Aucune partie correspondant à vos filtres.
      </div>

      <div v-else class="games-list">
        <div v-for="game in filteredGames" :key="game.ID_Game" class="game-card">
          <div class="game-header">
            <h3>Partie #{{ game.ID_Game }}</h3>
            <span v-if="refreshing" class="refresh-dot"></span>
          </div>

          <p>👤 Créateur : {{ game.CreatorPseudo || "Inconnu" }}</p>
          <p>👥 Joueurs : {{ game.CurrentPlayers }}/{{ game.TotalPlayers }}</p>
          <p>
            🌍 Langue :
            {{ game.Language === "fr" ? "Français" : game.Language === "be" ? "Belge" : "Inconnu" }}
          </p>
          <p>⚔️ Mode : {{ formatMode(game.TeamMode) }}</p>

          <button @click="joinGame(game.ID_Game)" class="join-btn">Rejoindre</button>
        </div>
      </div>
    </div>

    <button class="back-btn" @click="$router.push('/')">⬅️ Retour</button>
  </div>
</template>

<script>
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
      //   Filtrer uniquement les parties en préparation et non-pleines
      const filtered = this.publicGames
        .filter((game) => game.Status === "preparation")
        .filter((game) => game.TotalPlayers === null || game.CurrentPlayers < game.TotalPlayers)
        .filter((game) => !this.selectedLanguage || game.Language === this.selectedLanguage)
        .filter((game) => !this.selectedMode || game.TeamMode === this.selectedMode);

      console.log("⚔️ filteredGames :", filtered);
      return filtered;
    },
  },
  mounted() {
    this.user = JSON.parse(localStorage.getItem("user"));
    this.fetchPublicGames();

    // 🔁 Rafraîchissement auto toutes les 5 secondes
    this.refreshInterval = setInterval(() => {
      this.refreshPublicGames();
    }, 5000);
  },
  beforeUnmount() {
    clearInterval(this.refreshInterval);
  },
  methods: {
    async fetchPublicGames() {
      this.loading = true;
      try {
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/public");
        const data = await res.json();
        if (data.success) this.publicGames = data.games;
      } catch (err) {
        console.error("❌ Erreur réseau :", err);
      } finally {
        this.loading = false;
      }
    },

    async refreshPublicGames() {
      this.refreshing = true;
      try {
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/public");
        const data = await res.json();
        if (data.success) this.publicGames = data.games;
      } catch (err) {
        console.error("❌ Erreur de mise à jour :", err);
      } finally {
        setTimeout(() => (this.refreshing = false), 500);
      }
    },

    applyFilters() {
      // Rien à faire ici, le computed `filteredGames` s'occupe du filtrage
      console.log("Filtres appliqués :", this.selectedLanguage, this.selectedMode);
    },

    formatMode(mode) {
      switch (mode) {
        case "1v1":
          return "1 vs 1";
        case "2v2":
          return "2 vs 2";
        case "3v3":
          return "3 vs 3";
        case "4v4":
          return "4 vs 4";
        case "battle-royale":
          return "Battle Royale";
        default:
          return mode;
      }
    },

    async joinGame(gameId) {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        alert("Vous devez être connecté pour rejoindre une partie.");
        return;
      }

      const playerId = Number(user.ID_Users || user.id || user.userId);
      if (!playerId) {
        alert("Impossible de récupérer votre ID. Veuillez vous reconnecter.");
        return;
      }

      try {
        const res = await fetch(
          `https://battleship-api-i276.onrender.com/api/games/join/${gameId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId }),
          },
        );

        const data = await res.json();
        if (!data.success) {
          alert(data.message || "Erreur lors de la tentative de rejoindre la partie.");
          return;
        }

        localStorage.setItem("currentGame", JSON.stringify({ gameId, playerId }));
        this.$router.push({ name: "WaitingRoom", params: { gameId } });
      } catch (err) {
        console.error("❌ Erreur lors de la tentative :", err);
        alert("Erreur réseau ou serveur. Veuillez réessayer plus tard.");
      }
    },
  },
};
</script>

<style scoped>
.join-game-container {
  text-align: center;
  padding: 2rem;
  min-height: 100vh;
  background: radial-gradient(circle at top, #1e2a44, #0d1117);
  color: #f0f0f0;
  font-family: "Poppins", sans-serif;
}

/* 🔍 Titre */
h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #58a6ff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
}

/* 🎛️ Filtres */
.filters {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}
.filter-group:hover {
  border-color: #58a6ff;
  box-shadow: 0 0 8px rgba(88, 166, 255, 0.2);
}
label {
  font-weight: 500;
  color: #c9d1d9;
}
select {
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  color: #f0f0f0;
  font-weight: 500;
  cursor: pointer;
}
select:focus {
  outline: none;
  box-shadow: 0 0 8px #58a6ff;
}

/* 🧩 Liste de parties */
.games-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
  padding: 0 1rem;
}

/* 🪪 Carte de partie */
.game-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1rem;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}
.game-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 6px 18px rgba(88, 166, 255, 0.3);
}

/* 🧭 En-tête carte */
.game-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
.game-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #58a6ff;
}
.refresh-dot {
  width: 10px;
  height: 10px;
  background: #00ff88;
  border-radius: 50%;
  animation: pulse 0.8s ease-in-out infinite;
}
@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 📜 Détails de la partie */
p {
  margin: 0.3rem 0;
  font-size: 0.95rem;
  color: #c9d1d9;
}

/* 🚀 Bouton rejoindre */
.join-btn {
  background: linear-gradient(135deg, #238636, #2ea043);
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.6rem;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.join-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(46, 160, 67, 0.6);
}

/* ⬅️ Bouton retour */
.back-btn {
  margin-top: 2rem;
  background: none;
  border: 1px solid #58a6ff;
  color: #58a6ff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.back-btn:hover {
  background: #58a6ff;
  color: #0d1117;
  transform: scale(1.05);
}

/* 💾 États */
.loading,
.empty {
  margin-top: 2rem;
  font-style: italic;
  color: #aaa;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
}
</style>
