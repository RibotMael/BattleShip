<template>
  <div class="place-ships-container">
    <h1>🚢 Placement des bateaux</h1>
    <p>Partie ID : {{ game.ID_Game }}</p>
    <p>Joueurs prêts : {{ readyPlayers.length }}/{{ game.TotalPlayers }}</p>

    <!-- Grille adversaire (en haut) -->
    <div class="enemy-grid">
      <h2>Grille adversaire</h2>
      <div class="grid">
        <div
          v-for="(cell, index) in enemyGrid"
          :key="index"
          class="cell"
        ></div>
      </div>
    </div>

    <!-- Grille joueur (en bas) -->
    <div class="player-grid">
      <h2>Votre grille</h2>
      <div class="grid">
        <div
          v-for="(cell, index) in grid"
          :key="index"
          class="cell"
          :class="{ ship: cell.hasShip }"
          @click="placeShip(index)"
        ></div>
      </div>
    </div>

    <button
      :disabled="!canValidate"
      @click="validatePlacement"
    >
      ✅ Valider mes bateaux
    </button>
  </div>
</template>

<script>
export default {
  props: { gameId: { type: String, required: true } },
  data() {
    return {
      game: { ID_Game: 0, TotalPlayers: 2 },
      grid: Array(100).fill({ hasShip: false }),
      enemyGrid: Array(100).fill({ hit: false }),
      readyPlayers: [],
      user: JSON.parse(localStorage.getItem("user")),
      userId: 0
    };
  },
  computed: {
    canValidate() {
      return this.grid.filter(c => c.hasShip).length > 0;
    }
  },
  mounted() {
    this.userId = Number(this.user?.id);
    this.game.ID_Game = Number(this.gameId);
    this.fetchGame();
  },
  methods: {
    async fetchGame() {
      try {
        const res = await fetch(`http://localhost:3000/api/games/${this.game.ID_Game}`);
        const data = await res.json();
        if (data.success) {
          this.game = { ...this.game, ...data.game };
          this.readyPlayers = data.readyPlayers || [];
        }
      } catch (err) { console.error(err); }
    },
    placeShip(index) {
      this.$set(this.grid, index, { hasShip: !this.grid[index].hasShip });
    },
    async validatePlacement() {
      try {
        const res = await fetch(`http://localhost:3000/api/games/place-ships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            playerId: this.userId,
            ships: this.grid.map(c => c.hasShip ? 1 : 0)
          })
        });
        const data = await res.json();
        if (data.success) alert("Placement validé ! En attente des autres joueurs.");
        await this.fetchGame();
      } catch (err) { console.error(err); }
    }
  }
};
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(10, 30px);
  grid-template-rows: repeat(10, 30px);
  gap: 2px;
}
.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #444;
  background-color: #87ceeb;
}
.cell.ship {
  background-color: #444;
}
.enemy-grid, .player-grid {
  margin-bottom: 20px;
}
</style>
