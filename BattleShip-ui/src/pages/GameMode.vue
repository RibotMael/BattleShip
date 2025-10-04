<!-- GameMode.vue -->
<template>
  <div class="game-mode-container">
    <div class="game-mode-card">
      <h1>🎮 Paramètres de la partie</h1>

      <!-- Choix de la langue -->
      <label for="language">Langue :</label>
      <select id="language" v-model="language">
        <option value="fr">Français</option>
        <option value="be">Belge</option>
      </select>

      <!-- Partie privée -->
      <label class="checkbox-label">
        <input type="checkbox" v-model="isPrivate" />
        Partie privée 🔒
      </label>

      <!-- Modes publics -->
      <div v-if="!isPrivate">
        <label for="mode">Mode de bataille :</label>
        <select id="mode" v-model="mode">
          <option value="1v1">1 vs 1</option>
          <option value="2v2">2 vs 2</option>
          <option value="4v4">4 vs 4</option>
          <option value="battle-royale">Battle Royale</option>
        </select>
      </div>

      <!-- Modes privés -->
      <div v-else class="private-settings">
        <label>Nombre total de participants (pair) :</label>
        <input
          type="number"
          v-model.number="totalPlayers"
          min="2"
          max="20"
          step="2"
        />
        <p v-if="totalPlayers % 2 !== 0" class="error-text">⚠️ Le nombre doit être pair !</p>
        <p v-else>{{ totalPlayers / 2 }} vs {{ totalPlayers / 2 }}</p>
      </div>

      <button
        class="start-button"
        @click="startGame"
        :disabled="!canStart || loading"
      >
        {{ loading ? "⏳ Création en cours..." : "🚀 Lancer la partie" }}
      </button>
      <button class="cancel-button" @click="$router.push('/')">Retour</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      language: "fr",
      mode: "1v1",
      isPrivate: false,
      totalPlayers: 2,
      loading: false,
      user: null
    };
  },
  computed: {
    canStart() {
      return (
        this.user &&
        (!this.isPrivate || (this.totalPlayers >= 2 && this.totalPlayers % 2 === 0))
      );
    }
  },
  mounted() {
    this.user = JSON.parse(localStorage.getItem("user"));
  },
  methods: {
    getTeamModeFromSelection(mode) {
      switch(mode) {
        case '1v1': return 1;
        case '2v2': return 2;
        case '4v4': return 3;
        case 'battle-royale': return 4;
        default: return 1;
      }
    },
    async startGame() {
      if (!this.user?.id) {
        alert("⚠️ Utilisateur non connecté !");
        return;
      }

      this.loading = true;

      try {
        // 🔹 ID du mode d'équipe
        const teamModeId = this.isPrivate ? 2 : this.getTeamModeFromSelection(this.mode);

        // 🔹 Calcul du nombre total de joueurs
        let totalPlayers;
        if (this.isPrivate) {
          totalPlayers = this.totalPlayers;
        } else {
          switch(teamModeId) {
            case 1: totalPlayers = 2; break;
            case 2: totalPlayers = 4; break;
            case 3: totalPlayers = 8; break;
            case 4: totalPlayers = 20; break;
            default: totalPlayers = 2;
          }
        }

        const payload = {
          hostId: Number(this.user.id),
          id_game_mode: 1,
          id_game_type: 2, // Team
          id_team_mode: teamModeId,
          id_version: this.language === "fr" ? 1 : 2,
          totalPlayers
        };

        console.log("🎮 Création partie payload:", payload);

        const res = await fetch("http://localhost:3000/api/games/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
          alert(data.message || "Erreur lors de la création de la partie.");
          return;
        }

        const normalizedGame = {
          ID_Game: data.game.ID_Game || data.game.id_game || data.game.id,
          ID_Creator: data.game.ID_Creator || data.game.id_creator || data.game.creatorId,
          TotalPlayers: data.game.TotalPlayers || data.game.totalPlayers || totalPlayers,
          Status: data.game.Status || data.game.status || "preparation"
        };

        localStorage.setItem("currentGame", JSON.stringify(normalizedGame));
        localStorage.setItem("currentLanguage", this.language);
        localStorage.setItem("user", JSON.stringify(this.user));

        // 🔹 Passage à la salle d'attente
        this.$router.push({ 
          name: "WaitingRoom", 
          params: { gameId: normalizedGame.ID_Game } 
        });

      } catch (err) {
        console.error("❌ Erreur dans startGame:", err);
        alert("Impossible de contacter le serveur.");
      } finally {
        this.loading = false;
      }
    }
  },
  watch: {
    mode(newMode) {
      if (!this.isPrivate) {
        const teamModeId = this.getTeamModeFromSelection(newMode);
        switch (teamModeId) {
          case 1: this.totalPlayers = 2; break;
          case 2: this.totalPlayers = 4; break;
          case 3: this.totalPlayers = 8; break;
          case 4: this.totalPlayers = 20; break;
          default: this.totalPlayers = 2;
        }
        console.log(`[WATCH] Mode changé : ${newMode}, totalPlayers = ${this.totalPlayers}`);
      }
    },
    isPrivate(isPrivate) {
      if (!isPrivate) {
        // Recalculer totalPlayers selon le mode public
        const teamModeId = this.getTeamModeFromSelection(this.mode);
        switch (teamModeId) {
          case 1: this.totalPlayers = 2; break;
          case 2: this.totalPlayers = 4; break;
          case 3: this.totalPlayers = 8; break;
          case 4: this.totalPlayers = 20; break;
          default: this.totalPlayers = 2;
        }
      }
    }
  }

};
</script>

<style scoped>
/* Ton style existant */
.game-mode-container {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.game-mode-card {
  background-color: white;
  color: black;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #005f8e;
}

label {
  font-weight: bold;
  margin-top: 1rem;
  display: block;
}

input[type="number"],
select {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.3rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-weight: bold;
}

.error-text {
  color: #e74c3c;
  font-weight: bold;
}

button {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
}

.start-button {
  background-color: #2980b9;
  color: white;
}

.start-button:disabled {
  background-color: #a5b1c2;
  cursor: not-allowed;
}

.start-button:hover:not(:disabled) {
  background-color: #216f9d;
}

.cancel-button {
  background-color: #e0e0e0;
  color: black;
}

.cancel-button:hover {
  background-color: #c0c0c0;
}
</style>
