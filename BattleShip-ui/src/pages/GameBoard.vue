<template>
  <div class="battle-container">
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
              ship: cell.shipNumber && cell.shipNumber !== 0,
              hit: cell.status === 'hit',
              miss: cell.status === 'miss',
              sunk: cell.status === 'sunk',
            }"
          >
            <span v-if="cell.shipNumber">{{ cell.shipNumber }}</span>
          </div>
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

      <!-- Grille Adversaire + Dropdown Battle Royale -->
      <div class="grid-section">
        <h2>
          Adversaire
          <select
            v-if="opponents.length > 1"
            v-model="currentOpponentIndex"
            class="opponent-dropdown"
          >
            <option v-for="(opp, i) in opponents" :key="opp.id" :value="i">
              {{ opp.pseudo }}
            </option>
          </select>
        </h2>

        <div class="grid opponent-grid">
          <div
            v-for="(cell, index) in currentOpponent.grid"
            :key="index"
            class="cell"
            :class="{
              hit: cell === 'hit',
              miss: cell === 'miss',
              sunk: cell === 'sunk',
              selected: cell === 'selected',
            }"
            @click="selectCell(index)"
          ></div>
        </div>
      </div>
    </div>

    <!-- Popup fin de partie -->
    <div v-if="endPopup" class="end-popup">
      <div class="popup-content">
        <h1>{{ popupMessage }}</h1>
        <button @click="goHome">Retour à l'accueil</button>
      </div>
    </div>
  </div>
</template>

<script>
import socket from "../services/socket.js";

export default {
  name: "GameBoard",
  props: {
    gameId: { type: String, required: true },
    gameType: { type: String, required: true }, // "1v1" ou "BattleRoyal"
  },
  data() {
    return {
      playerGrid: Array.from({ length: 100 }, () => ({ shipNumber: 0, status: "" })),
      opponents: [],
      currentOpponentIndex: 0,
      turnTimer: 8,
      gameOver: false,
      fetchInterval: null,
      turnInterval: null,
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      selectedCell: null,
      endPopup: false,
      popupMessage: "",
      playerStatus: "in_game",
    };
  },
  computed: {
    currentOpponent() {
      return this.opponents[this.currentOpponentIndex] || { id: null, grid: Array(100).fill("") };
    },
    is1v1() {
      return this.gameType === "1v1";
    },
  },
  mounted() {
    this.resetGameState();
    this.initGame();

    window.addEventListener("keydown", this.preventRefresh);
    window.addEventListener("popstate", this.preventBack);
    window.addEventListener("beforeunload", this.preventUnload);

    socket.on("connect", () => console.log("⚡ Socket connecté", socket.id));
    socket.on("turn-timer", this.socketTurnTimer);
    socket.on("turn-ended", this.endTurn);
    socket.on("shot-fired", this.onShotFired);
    socket.on("player-eliminated", this.onPlayerEliminated);
    socket.on("game-over", ({ winnerId, isDraw }) => {
      let msg = "💥 Défaite !";

      if (isDraw) {
        msg = "⚖️ Égalité parfaite !";
      } else if (winnerId === this.user.id) {
        msg = "🏆 Victoire !";
      }

      this.showEndPopup(msg);
    });
  },
  beforeUnmount() {
    clearInterval(this.fetchInterval);
    clearInterval(this.turnInterval);
    socket.off("turn-timer");
    socket.off("turn-ended");
    socket.off("shot-fired");
    socket.off("player-eliminated");
    socket.off("game-over");

    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);
  },
  methods: {
    /* ----------------- Timer ----------------- */
    socketTurnTimer({ timeLeft }) {
      this.turnTimer = timeLeft;
      this.updateCircle();
    },
    endTurn() {
      if (this.gameOver) return;
      this.turnTimer = 0;
      this.updateCircle();
      this.validateShot();
    },
    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      if (!circle) return;
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDashoffset = circumference - (this.turnTimer / 8) * circumference;
    },

    /* ----------------- Init & Reset ----------------- */
    resetGameState() {
      clearInterval(this.turnInterval);
      clearInterval(this.fetchInterval);
      this.turnTimer = 8;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
    },
    async initGame() {
      this.resetGameState();
      await this.fetchPlayerBoard();
      if (this.is1v1) await this.fetchOpponent();
      else await this.fetchOpponents();

      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });

      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);

      this.turnTimer = 8;
      this.updateCircle();
    },

    /* ----------------- Grilles ----------------- */
    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/board?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        this.playerGrid = data.board
          .flat()
          .map((cell) => ({ shipNumber: cell > 0 ? cell : 0, status: "" }));
      } catch (err) {
        console.error("Erreur fetchPlayerBoard :", err);
      }
    },
    async fetchOpponent() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/opponent?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        this.opponents = [
          {
            id: data.opponentId,
            pseudo: data.opponentPseudo || "Adversaire",
            grid: Array(100).fill(""),
          },
        ];
        this.currentOpponentIndex = 0;
      } catch (err) {
        console.error(err);
      }
    },
    async fetchOpponents() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/opponents?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        this.opponents = data.opponents.map((o) => ({ ...o, grid: Array(100).fill("") }));
      } catch (err) {
        console.error(err);
      }
    },
    updateGridCell(opponent, index, value) {
      // clone la grille pour éviter la mutation directe
      const newGrid = [...opponent.grid];
      newGrid[index] = value;
      opponent.grid = newGrid;
    },

    /* ----------------- Sélection & Tir ----------------- */
    selectCell(index) {
      if (this.gameOver) return;
      const val = this.currentOpponent.grid[index];
      if (["hit", "miss", "sunk", "selected"].includes(val)) return;

      if (this.selectedCell !== null)
        this.updateGridCell(this.currentOpponent, this.selectedCell, "");
      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent, index, "selected");
    },
    async validateShot() {
      if (this.gameOver || this.turnTimer !== 0) return;
      let index = this.selectedCell;
      if (index === null) {
        const available = this.currentOpponent.grid
          .map((v, i) => (v === "" ? i : null))
          .filter((i) => i !== null);
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }
      this.updateGridCell(this.currentOpponent, index, "");
      this.selectedCell = null;
      await this.sendShoot(index);
    },
    async sendShoot(index) {
      if (this.gameOver) return;
      const targetId = this.currentOpponent.id;
      const x = index % 10;
      const y = Math.floor(index / 10);
      try {
        const res = await fetch("http://localhost:8080/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, targetId, x, y }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        this.applyShot(targetId, x, y, data.result, data.positions);
      } catch (err) {
        console.error(err);
      }
    },
    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      if (targetId === this.user.id) {
        const newGrid = [...this.playerGrid];
        newGrid[idx].status = result;
        if (positions)
          positions.forEach((p) => {
            newGrid[p.y * 10 + p.x].status = "sunk";
          });
        this.playerGrid = newGrid;
      } else {
        const target = this.opponents.find((o) => o.id === targetId);
        if (!target) return;
        const newGrid = [...target.grid];
        newGrid[idx] = result;
        if (positions)
          positions.forEach((p) => {
            newGrid[p.y * 10 + p.x] = "sunk";
          });
        target.grid = newGrid;
      }
    },
    onShotFired({ shooterId, targetId, x, y, result, positions }) {
      const idx = y * 10 + x;

      // 🧍‍♂️ TIR SUR MOI
      if (targetId === this.user.id) {
        const newGrid = [...this.playerGrid];
        newGrid[idx].status = result;
        if (positions?.length) {
          positions.forEach((p) => {
            newGrid[p.y * 10 + p.x].status = "sunk";
          });
        }
        this.playerGrid = newGrid;

        // Vérifier si défaite
        this.checkDefeat();
        return;
      }

      // 🎯 TIR sur adversaire
      const targetOpponent = this.opponents.find((o) => o.id === targetId);
      if (!targetOpponent) return;
      const newGrid = [...targetOpponent.grid];
      newGrid[idx] = result;
      if (positions?.length) {
        positions.forEach((p) => {
          newGrid[p.y * 10 + p.x] = "sunk";
        });
      }
      targetOpponent.grid = newGrid;
    },

    /* ----------------- Enemy shots ----------------- */
    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        // Joueur
        const newPlayerGrid = [...this.playerGrid];
        (data.incomingShots || []).forEach((s) => {
          const idx = s.y * 10 + s.x;
          newPlayerGrid[idx].status = s.state === "pending" ? "selected" : s.result;
          if (s.positions)
            s.positions.forEach((p) => {
              newPlayerGrid[p.y * 10 + p.x].status = "sunk";
            });
        });
        this.playerGrid = newPlayerGrid;

        // Adverses
        this.opponents.forEach((o) => {
          const newGrid = [...o.grid];
          (data.playerShots || [])
            .filter((s) => s.target_id === o.id)
            .forEach((s) => {
              const idx = s.y * 10 + s.x;
              newGrid[idx] = s.state === "pending" ? "selected" : s.result;
              if (s.positions)
                s.positions.forEach((p) => {
                  newGrid[p.y * 10 + p.x] = "sunk";
                });
            });
          o.grid = newGrid;
        });

        // 🔥 VÉRIFIER DÉFAITE APRÈS SYNCHRO
        this.checkDefeat();
      } catch (err) {
        console.error(err);
      }
    },

    /* ----------------- Battle Royale ----------------- */
    onPlayerEliminated({ playerId, aliveCount }) {
      if (playerId === this.user.id) return;
      this.opponents = this.opponents.filter((o) => o.id !== playerId);
      this.addGameLog(`💀 Joueur éliminé (${aliveCount} restants)`);
      if (this.currentOpponentIndex >= this.opponents.length) this.currentOpponentIndex = 0;
    },

    async checkGameStatus() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/status?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        if (data.finished && !this.gameOver) {
          this.gameOver = true;
          clearInterval(this.fetchInterval);
          const msg = data.winner === this.user.id ? "🏆 Victoire !" : "💥 Défaite !";
          this.showEndPopup(msg);
          await this.fetchEnemyShots();
        }
      } catch (err) {
        console.error(err);
      }
    },

    /* ----------------- Fin / Abandon ----------------- */
    showEndPopup(msg) {
      this.popupMessage = msg;
      this.endPopup = true;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.turnTimer = 8;
      this.updateCircle();
    },
    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner ?")) return;
      try {
        const res = await fetch("http://localhost:8080/api/games/eliminate-player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, reason: "abandon" }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        clearInterval(this.fetchInterval);
        this.showEndPopup(this.is1v1 ? "💥 Défaite par abandon" : "💀 Vous avez abandonné");
      } catch (err) {
        console.error(err);
      }
    },
    async checkDefeat() {
      const allSunk = this.playerGrid
        .filter((cell) => cell.shipNumber > 0)
        .every((cell) => cell.status === "sunk");

      if (allSunk && !this.gameOver) {
        this.gameOver = true;

        // ⬅️ On NOTIFIE le serveur
        await fetch("http://localhost:8080/api/games/eliminate-player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            reason: "shot",
          }),
        });

        // ❌ PAS DE POPUP ICI
        // ❌ PAS DE MESSAGE LOCAL
      }
    },

    goHome() {
      this.$router.push("/");
    },
    addGameLog(msg) {
      console.log(msg);
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
  transition:
    transform 0.2s,
    box-shadow 0.2s;
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

/* --- Styles inchangés, avec amélioration pour visibilité des bateaux --- */
.player-grid .cell.ship {
  background-color: #1976d2;
  border: 2px solid #90caf9;
  box-shadow: inset 0 0 5px #2196f3;
}
.player-grid .cell.hit {
  background-color: #ff4444;
}
.player-grid .cell.miss {
  background-color: #00bcd4;
}
.player-grid .cell.sunk {
  background-color: #d32f2f;
}
.opponent-grid .cell.selected {
  background-color: rgba(255, 255, 0, 0.6);
  border: 2px solid yellow;
}

.end-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
}

.end-popup .popup-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.end-popup h1 {
  margin-bottom: 20px;
  font-size: 2rem;
  text-align: center;
}
.end-popup button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background: #1976d2;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.end-popup .popup-content h1 {
  margin-bottom: 20px;
  font-size: 2rem;
  text-align: center;
  color: #222; /* texte sombre sur fond blanc */
}
</style>
