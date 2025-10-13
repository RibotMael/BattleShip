<!-- GameBoard.vue -->
<template>
  <div class="battle-container">
    <div class="grids-wrapper">
      <!-- ✅ Grille Joueur à gauche -->
      <div class="grid-section">
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

      <!-- ✅ Grille Adversaire à droite -->
      <div class="grid-section">
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
      </div>
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
      playerGrid: Array(100).fill(0),
      opponentGrid: Array(100).fill(0),
    };
  },
  methods: {
    async shoot(index) {
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
  },
};
</script>

<style scoped>
/* ✅ Prend tout l’écran */
.battle-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  overflow: hidden;
}

.grids-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 100px; /* Plus grand espace pour grand écran */
}

.grid-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

h2 {
  color: white;
  margin-bottom: 15px;
  font-size: 1.8rem;
}

/* ✅ Taille adaptée pour grand écran */
.grid {
  display: grid;
  grid-template-columns: repeat(10, 50px); /* agrandi les cellules */
  gap: 3px;
}

.cell {
  width: 50px;
  height: 50px;
  background: #eee;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: transform 0.2s;
}

.cell:hover {
  transform: scale(1.1);
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
</style>
