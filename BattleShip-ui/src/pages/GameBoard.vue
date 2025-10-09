<!--GameBoard.vue-->
<template>
  <div class="battle-container">
    <!-- Grille adversaire -->
    <h2>Adversaire</h2>
    <div class="grid opponent-grid">
      <div
        v-for="(cell, index) in opponentGrid"
        :key="index"
        class="cell"
        :class="{
          hit: cell === 'hit',
          miss: cell === 'miss',
        }"
        @click="shoot(index)"
      ></div>
    </div>

    <!-- Notre grille -->
    <h2>Notre flotte</h2>
    <div class="grid player-grid">
      <div
        v-for="(cell, index) in playerGrid"
        :key="index"
        class="cell"
        :class="{
          ship: cell === 1,
          hit: cell === 'hit',
          miss: cell === 'miss',
        }"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "BattleBoard",
  props: {
    game: { type: Object, required: true },
    user: { type: Object, required: true },
  },
  data() {
    return {
      playerGrid: Array(100).fill(0), // notre flotte
      opponentGrid: Array(100).fill(0), // état des tirs sur l'adversaire
      placedShips: [], // navires placés
      readyCount: 0,
      total: 0,
      polling: null,
    };
  },
  methods: {
    async shoot(index) {
      // Empêche de tirer sur la même case
      if (this.opponentGrid[index]) return;

      try {
        const res = await fetch("http://localhost:3000/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            playerId: this.user.id,
            cell: index + 1,
          }),
        });
        const data = await res.json();
        if (data.success) {
          this.opponentGrid[index] = data.hit ? "hit" : "miss";
        }
      } catch (err) {
        console.error("Erreur shoot :", err);
      }
    },

    async fetchFullGame() {
      try {
        if (!this.game || !this.game.ID_Game) {
          console.warn("⏳ Game non défini, on attend...");
          return;
        }

        const res = await fetch(`http://localhost:3000/api/games/${this.game.ID_Game}`);
        const data = await res.json();
        if (data.success) {
          this.fullGame = data.game;
        } else {
          console.error("Erreur chargement partie :", data.message);
        }
      } catch (err) {
        console.error("Erreur fetchFullGame :", err);
      }
    },

    startPolling() {
      this.pollInterval = setInterval(() => {
        this.fetchFullGame();
      }, 1000);
    },
    beforeUnmount() {
      clearInterval(this.pollInterval);
    },
  },
  mounted() {
    this.gameId = Number(this.$route.params.gameId);

    if (!this.gameId) {
      console.error("❌ Aucun gameId trouvé dans les params !");
      return;
    }

    this.game = { ID_Game: this.gameId };

    // ✅ Démarrer le polling seulement après avoir défini this.game
    this.startPolling();
  },
  beforeUnmount() {
    if (this.polling) clearInterval(this.polling);
  },
};
</script>

<style scoped>
.battle-container {
  text-align: center;
  padding: 20px;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
}

.grid {
  display: grid;
  grid-template-columns: repeat(10, 30px);
  gap: 2px;
  justify-content: center;
  margin: 10px auto;
}

.cell {
  width: 30px;
  height: 30px;
  background: #eee;
  border: 1px solid #ccc;
  cursor: pointer;
}
.cell.ship {
  background: #2196f3;
}
.cell.hit {
  background: #e74c3c;
}
.cell.miss {
  background: #95a5a6;
}

.status {
  font-weight: bold;
  margin-top: 15px;
}
</style>
