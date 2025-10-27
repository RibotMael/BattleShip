<template>
  <div class="battle-container">
    <!-- Bouton Abandonner -->
    <button class="btn-abandon" @click="abandonGame">Abandonner</button>

    <div class="grids-wrapper">
      <!-- Grille Joueur -->
      <div class="grid-section">
        <h2>Notre flotte</h2>
        <div class="grid player-grid">
          <div
            v-for="(cell, index) in playerGrid"
            :key="index"
            class="cell"
            :class="{
              ship: cell === 'ship',
              hit: cell === 'hit',
              miss: cell === 'miss',
            }"
          ></div>
        </div>
      </div>

      <!-- Chrono circulaire -->
      <div class="timer-circle">
        <svg class="progress-ring" width="120" height="120">
          <circle
            class="progress-ring__circle"
            stroke="white"
            stroke-width="8"
            fill="transparent"
            r="54"
            cx="60"
            cy="60"
          />
        </svg>
        <div class="timer-text">{{ turnTimer }}s</div>
      </div>

      <!-- Grille Adversaire -->
      <div class="grid-section">
        <h2>Adversaire</h2>
        <div class="grid opponent-grid">
          <div
            v-for="(cell, index) in opponentGrid"
            :key="index"
            class="cell"
            :class="{ hit: cell === 'hit', miss: cell === 'miss' }"
            @click="shoot(index)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "GameBoard",
  props: {
    gameId: { type: String, required: true },
  },
  data() {
    return {
      playerGrid: Array(100).fill(0),
      opponentGrid: Array(100).fill(0),
      turnTimer: 8,
      gameOver: false,
      turnInterval: null,
      replayInterval: null,
      replayVotes: {},
      user: JSON.parse(localStorage.getItem("user")),
      selectedCell: null, // ✅ case actuellement ciblée
    };
  },
  mounted() {
    this.fetchPlayerBoard();
    this.startChrono();
    this.enemyShotsInterval = setInterval(this.fetchEnemyShots, 2000);
    this.statusInterval = setInterval(this.checkGameStatus, 2000);
    window.addEventListener("keydown", this.preventRefresh);
    window.history.pushState(null, document.title, window.location.href);
    window.addEventListener("popstate", this.preventBack);
    window.addEventListener("beforeunload", this.preventUnload);
  },
  beforeUnmount() {
    if (this.turnInterval) clearInterval(this.turnInterval);
    if (this.replayInterval) clearInterval(this.replayInterval);
    if (this.enemyShotsInterval) clearInterval(this.enemyShotsInterval);
    if (this.statusInterval) clearInterval(this.statusInterval);
    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);
  },
  methods: {
    preventRefresh(e) {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r")) e.preventDefault();
    },
    preventBack() {
      window.history.pushState(null, document.title, window.location.href);
    },
    preventUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    },
    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `http://localhost:3000/api/games/${this.gameId}/board?playerId=${this.user.id}`
        );
        const data = await res.json();

        if (!data.success) return console.warn(data.message);

        // le board est un tableau 10x10
        const flatBoard = data.board.flat();

        // ⚓ place les bateaux dans la grille du joueur
        this.playerGrid = flatBoard.map((cell) => (cell === 1 ? "ship" : 0));
      } catch (err) {
        console.error("Erreur fetchPlayerBoard :", err);
      }
    },

    // ---------------- TIMER ----------------
    startChrono() {
      this.turnTimer = 8;
      if (this.turnInterval) clearInterval(this.turnInterval);
      this.updateCircle();

      this.turnInterval = setInterval(async () => {
        if (this.gameOver) {
          clearInterval(this.turnInterval);
          return;
        }

        this.turnTimer--;
        this.updateCircle();

        if (this.turnTimer <= 0) {
          // ✅ Envoie le tir choisi ou auto
          await this.validateShot();
          // ✅ Récupère les tirs adverses et les applique à notre grille
          await this.fetchEnemyShots();
          this.turnTimer = 8;
          this.updateCircle();
          this.selectedCell = null;
        }
      }, 1000);
    },

    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (this.turnTimer / 8) * circumference;
      circle.style.strokeDashoffset = offset;
    },

    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner la partie ?")) return;

      try {
        await fetch("http://localhost:3000/api/games/abandon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
          }),
        });

        this.gameOver = true;
        clearInterval(this.turnInterval);
        clearInterval(this.enemyShotsInterval);
        alert("Vous avez abandonné la partie.");
        this.$router.push("/");
      } catch (err) {
        console.error("Erreur abandon :", err);
      }
    },

    // ---------------- CLIC SUR UNE CASE ----------------
    shoot(index) {
      if (this.gameOver) return;
      if (this.opponentGrid[index] === "hit" || this.opponentGrid[index] === "miss") return;

      // ✅ Permet de changer le tir pendant les 8s
      this.selectedCell = index;

      // ✅ Mise à jour visuelle : surligner la sélection
      this.opponentGrid = this.opponentGrid.map((cell, i) =>
        i === index ? "selected" : cell === "selected" ? 0 : cell
      );
    },

    // ---------------- VALIDER LE TIR ----------------
    async validateShot() {
      if (this.gameOver) return;

      // ✅ Si aucune case sélectionnée, tir aléatoire
      let targetIndex = this.selectedCell;
      if (targetIndex === null) {
        const available = this.opponentGrid
          .map((v, i) => (v === 0 ? i : null))
          .filter((i) => i !== null);
        if (available.length === 0) return;
        targetIndex = available[Math.floor(Math.random() * available.length)];
      }

      await this.sendShoot(targetIndex);
    },

    // ---------------- ENVOI DU TIR ----------------
    async sendShoot(index) {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) throw new Error("Utilisateur introuvable dans localStorage");

        const res = await fetch("http://localhost:3000/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: user.id,
            cell: index + 1,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          console.warn("Tir échoué :", data.message);
          return;
        }

        this.opponentGrid[index] = data.result; // hit / miss / sunk
        this.selectedCell = null;

        if (data.gameOver) {
          this.gameOver = true;
          clearInterval(this.turnInterval);
          alert("Fin de partie !");
        }
      } catch (err) {
        console.error("Erreur shoot :", err);
      }
    },
    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `http://localhost:3000/api/games/${this.gameId}/shots?playerId=${this.user.id}`
        );
        const data = await res.json();
        if (!data.success) return;

        let updated = false;

        data.shots.forEach((s) => {
          const index = s.x * 10 + s.y;
          const result = s.result.toLowerCase();

          if (result === "hit") {
            this.playerGrid[index] = "hit"; // 🔥 touche un bateau
          } else if (result === "miss") {
            this.playerGrid[index] = "miss"; // 💧 tir raté
          }
        });
        this.playerGrid = [...this.playerGrid];

        // Forcer la réactivité
        if (updated) this.playerGrid = [...this.playerGrid];
      } catch (err) {
        console.error("Erreur fetchEnemyShots :", err);
      }
    },
    async checkGameStatus() {
      try {
        const res = await fetch(
          `http://localhost:3000/api/games/${this.gameId}/status?playerId=${this.user.id}`
        );
        const data = await res.json();

        if (res.data.gameOver) {
          if (res.data.winner === "draw") {
            alert("⚔ Égalité !");
          } else if (res.data.winner === userId) {
            alert("🏆 Victoire !");
          } else {
            alert("💥 Défaite !");
          }
        }
      } catch (err) {
        console.error("Erreur checkGameStatus :", err);
      }
    },
  },
};
</script>

<style>
.battle-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  overflow: hidden;
}

.grids-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 100px;
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

.grid {
  display: grid;
  grid-template-columns: repeat(10, 50px);
  gap: 3px;
}

.cell {
  width: 50px;
  height: 50px;
  background: #eee;
  border: 1px solid #9b9b9b;
  cursor: pointer;
  transition: transform 0.2s;
}

.cell.ship {
  background: #2196f3;
}

.cell.hit {
  background: orange;
}
.cell.sunk {
  background: red;
}

.cell.miss {
  background-color: cyan;
}

.cell.selected {
  background-color: rgba(255, 255, 0, 0.6);
  border: 2px solid yellow;
}

.opponent-grid .cell:hover {
  transform: scale(1.15) rotate(-2deg);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn-abandon {
  width: auto;
  top: 20px;
  right: 20px;
  padding: 10px 15px;
  background-color: red;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-abandon:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.timer-circle {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring__circle {
  stroke-dasharray: 339.292;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1s linear;
}

.timer-text {
  position: absolute;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}

.player-grid .cell.ship {
  background-color: #555; /* gris foncé */
}

.player-grid .cell.hit {
  background-color: #ff4444; /* rouge vif */
}

.player-grid .cell.miss {
  background-color: #00bcd4; /* bleu clair */
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}
</style>
