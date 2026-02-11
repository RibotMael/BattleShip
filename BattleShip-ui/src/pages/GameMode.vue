<template>
  <div class="game-mode-container">
    <div class="game-mode-card">
      <h1>⚓ Paramètres de la partie</h1>

      <!-- Choix de la langue -->
      <div class="form-group">
        <label for="language">🌍 Langue :</label>
        <select id="language" v-model="language">
          <option value="fr">Français</option>
          <option value="be">Belge</option>
        </select>
      </div>

      <!-- Partie privée -->
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="isPrivate" />
          Partie privée <span class="lock">🔒</span>
        </label>
      </div>

      <!-- Modes publics -->
      <div v-if="!isPrivate" class="form-group">
        <label for="mode">⚔️ Mode de bataille :</label>
        <select id="mode" v-model="mode">
          <option value="1v1">1 vs 1</option>
          <option value="2v2">2 vs 2</option>
          <option value="3v3">3 vs 3</option>
          <option value="4v4">4 vs 4</option>
          <option value="battle-royale">Battle Royale</option>
        </select>
      </div>

      <!-- Modes privés -->
      <div v-else class="private-settings form-group">
        <label>👥 Nombre total de participants (pair) :</label>
        <input
          type="number"
          v-model.number="totalPlayers"
          min="2"
          max="20"
          step="2"
          placeholder="Ex: 4"
        />
        <p v-if="totalPlayers % 2 !== 0" class="error-text">⚠️ Le nombre doit être pair !</p>
        <p v-else class="info-text">{{ totalPlayers / 2 }} vs {{ totalPlayers / 2 }}</p>
      </div>

      <button class="start-button neon-btn" @click="startGame" :disabled="!canStart || loading">
        {{ loading ? "⏳ Création en cours..." : "🚀 Lancer la partie" }}
      </button>

      <button class="cancel-button" @click="$router.push('/')">🏠 Retour</button>
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
      user: null,
    };
  },
  computed: {
    canStart() {
      // Battle Royale : minimum 2 joueurs
      if (this.mode === "battle-royale") return this.user;
      // Partie privée classique : pair >= 2
      if (this.isPrivate) return this.user && this.totalPlayers >= 2 && this.totalPlayers % 2 === 0;
      return this.user;
    },
  },
  mounted() {
    this.user = JSON.parse(localStorage.getItem("user"));
  },
  methods: {
    getTeamModeFromSelection(gameType) {
      switch (gameType) {
        case "1v1":
          return 1;
        case "2v2":
          return 2;
        case "3v3":
          return 3;
        case "4v4":
          return 4;
        case "battle-royale":
          return null; // Battle Royale n'a pas de FK
        default:
          throw new Error(`Mode inconnu : ${gameType}`);
      }
    },
    async startGame() {
      if (!this.user?.id) {
        alert("⚠️ Utilisateur non connecté !");
        return;
      }

      this.loading = true;

      try {
        // Déterminer id_team_mode
        const teamModeId = this.isPrivate
          ? Math.floor(this.totalPlayers / 2)
          : this.getTeamModeFromSelection(this.mode);

        // Calcul du totalPlayers pour la partie
        let totalPlayers;
        if (this.mode === "battle-royale") {
          totalPlayers = 2; // minimum, mais côté serveur tu peux gérer le max
        } else if (this.isPrivate) {
          totalPlayers = this.totalPlayers;
        } else {
          totalPlayers = teamModeId * 2; // 1v1 → 2, 2v2 → 4, etc.
        }

        const payload = {
          hostId: Number(this.user.id),
          id_game_mode: this.isPrivate ? 2 : 1, // privé/public
          id_game_type: this.mode === "battle-royale" ? 1 : 2, // type BattleRoyal = 1, Team = 2
          id_team_mode: teamModeId,
          id_version: this.language === "fr" ? 1 : 2,
          totalPlayers,
        };

        const res = await fetch("http://localhost:8080/api/games/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!data.success) {
          alert(data.message || "Erreur lors de la création de la partie.");
          return;
        }

        const normalizedGame = {
          ID_Game: data.game.ID_Game || data.game.id_game || data.game.id,
          ID_Creator: data.game.ID_Creator || data.game.id_creator || data.game.creatorId,
          TotalPlayers: data.game.TotalPlayers || totalPlayers,
          Status: data.game.Status || "preparation",
        };

        localStorage.setItem("currentGame", JSON.stringify(normalizedGame));
        localStorage.setItem("currentLanguage", this.language);
        localStorage.setItem("user", JSON.stringify(this.user));

        this.$router.push({
          name: "WaitingRoom",
          params: { gameId: normalizedGame.ID_Game },
        });
      } catch (err) {
        console.error("❌ Erreur dans startGame:", err);
        alert("Impossible de contacter le serveur.");
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.game-mode-container {
  background: radial-gradient(circle at center, #00334d, #001a26 90%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  font-family: "Orbitron", sans-serif;
  color: #fff;
}

.game-mode-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(0, 180, 255, 0.5);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  width: 100%;
  max-width: 450px;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 150, 255, 0.4);
  animation: fadeIn 0.6s ease-out;
}

h1 {
  font-size: 1.8rem;
  color: #00bfff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 8px #00bfff;
}

.form-group {
  margin-bottom: 1.2rem;
  text-align: left;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.3rem;
}

/* 🔹 Correction du fond et du texte des selects et inputs */
select,
input[type="number"] {
  width: 100%;
  padding: 0.6rem;
  background-color: rgba(0, 51, 77, 0.8); /* bleu foncé transparent */
  color: #fff;
  border: 1px solid rgba(0, 180, 255, 0.5);
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
  appearance: none; /* Supprime le style natif */
}

select:focus,
input[type="number"]:focus {
  border-color: #00bfff;
  box-shadow: 0 0 10px rgba(0, 180, 255, 0.6);
}

/* Option lisible dans le menu déroulant */
select option {
  background-color: #00263d;
  color: #fff;
}

.checkbox-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lock {
  margin-left: 5px;
}

.error-text {
  color: #ff6b6b;
  font-size: 0.9rem;
  margin-top: -0.3rem;
}

.info-text {
  color: #00ffaa;
  font-weight: bold;
}

button {
  width: 100%;
  padding: 0.9rem;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
  font-size: 1.05rem;
  transition: all 0.3s ease;
  margin-top: 1rem;
  border: none;
}

.neon-btn {
  background: linear-gradient(90deg, #009dff, #00eaff);
  color: #fff;
  box-shadow: 0 0 15px rgba(0, 200, 255, 0.6);
}

.neon-btn:hover:not(:disabled) {
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.9);
  transform: scale(1.03);
}

.neon-btn:disabled {
  background: #444;
  color: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
  color: #ccc;
}

.cancel-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
