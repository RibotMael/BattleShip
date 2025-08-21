<template>
  <div class="game-mode-container">
    <div class="game-mode-card">
      <h1>🎮 Paramètres de la partie</h1>

      <label for="language">Mode de jeu :</label>
      <select id="language" v-model="language">
        <option value="fr">Français</option>
        <option value="be">Belge</option>
      </select>

      <label class="checkbox-label">
        <input type="checkbox" v-model="isPrivate" />
        Partie privée 🔒
      </label>

      <!-- Mode public -->
      <div v-if="!isPrivate">
        <label for="mode">Mode de bataille :</label>
        <select id="mode" v-model="mode">
          <option value="1v1">1 vs 1</option>
          <option value="2v2">2 vs 2</option>
          <option value="4v4">4 vs 4</option>
          <option value="battle-royale">Battle Royale</option>
        </select>
      </div>

      <!-- Mode privé -->
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
        :disabled="isPrivate && totalPlayers % 2 !== 0"
      >
        🚀 Lancer la partie
      </button>
      <button class="cancel-button" @click="$router.push('/')">Retour</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      language: 'fr',
      mode: '1v1',
      isPrivate: false,
      totalPlayers: 2
    };
  },
  methods: {
    startGame() {
      const finalMode = this.isPrivate
        ? `${this.totalPlayers / 2}v${this.totalPlayers / 2}`
        : this.mode;

      const settings = {
        langue: this.language,
        mode: finalMode,
        isPrivate: this.isPrivate,
        total: this.isPrivate ? this.totalPlayers : 2,
        hostId: this.$store.state.user?.id || null
      };

      if (!settings.hostId) {
        alert("Utilisateur non connecté !");
        return;
      }

      fetch('http://localhost:3000/api/games/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            this.$router.push(`/waiting-room/${data.gameId}`);
          } else {
            alert(data.message || "Erreur lors de la création de la partie.");
          }
        })
        .catch(() => {
          alert("Impossible de contacter le serveur.");
        });
    }
  }
};
</script>

<style scoped>
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
