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

        <div class="grid opponent-grid" style="margin-top: 15px">
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
  props: { gameId: { type: String, required: true } },
  data() {
    return {
      playerGrid: Array.from({ length: 100 }, () => ({ shipNumber: 0, status: "" })),
      opponentGrid: Array.from({ length: 100 }, () => ""),
      opponentId: null,
      opponents: [],
      currentOpponentIndex: 0,
      turnTimer: 8,
      gameOver: false,
      fetchInterval: null,
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      selectedCell: null,
      endPopup: false,
      popupMessage: "",
      turnInterval: null,
      playerStatus: "in_game",
    };
  },
  computed: {
    currentOpponent() {
      return this.opponents.length > 0
        ? this.opponents[this.currentOpponentIndex]
        : { id: this.opponentId, grid: this.opponentGrid };
    },
    is1v1() {
      return this.$props.gameType === "1v1"; // tu peux passer gameType en prop depuis la page de jeu
    },
  },
  mounted() {
    this.resetGameState();
    this.initGame();

    // ⚡ Chrono local
    this.turnInterval = setInterval(() => {
      if (!this.gameOver && this.turnTimer > 0) {
        this.turnTimer -= 1;
        this.updateCircle();
      }
    }, 1000);

    window.addEventListener("keydown", this.preventRefresh);
    window.addEventListener("popstate", this.preventBack);
    window.addEventListener("beforeunload", this.preventUnload);

    socket.on("connect", () => console.log("⚡ Socket connecté", socket.id));

    // 🔄 On utilise maintenant nos méthodes dédiées
    socket.on("turn-timer", this.socketTurnTimer);
    socket.on("turn-ended", this.endTurn);

    socket.on("shot-fired", this.onShotFired);
    socket.on("player-eliminated", ({ playerId, reason, aliveCount }) => {
      if (playerId === this.user.id) return;

      // Mettre à jour uniquement la liste des adversaires
      this.opponents = this.opponents.filter((o) => o.id !== playerId);
      this.addGameLog(`💀 Un joueur a été éliminé (${aliveCount} restants)`);

      // En BR, attendre game-over si reste 1 joueur
    });

    socket.on("game-over", ({ winnerId }) => {
      const msg = winnerId === this.user.id ? "🏆 Victoire !" : "💥 Défaite !";
      this.showEndPopup(msg);
    });

    socket.on("player-left", ({ playerId, aliveCount, gameType }) => {
      if (playerId === this.user.id) return;
      if (this.is1v1) return; // 1v1 géré par game-over

      this.opponents = this.opponents.filter((o) => o.id !== playerId);
      this.addGameLog(`💀 Un joueur a été éliminé (${aliveCount} restants)`);

      if (gameType === "BattleRoyal" && aliveCount === 1) {
        // attendre game-over
      }
    });
  },

  beforeUnmount() {
    clearInterval(this.fetchInterval);
    clearInterval(this.turnInterval);
    socket.off("turn-timer");
    socket.off("turn-ended");
    socket.off("shot-fired");
    socket.off("game-over");

    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);
  },
  methods: {
    socketTurnTimer({ timeLeft }) {
      this.turnTimer = timeLeft;
      this.updateCircle();
    },

    // Quand le tour se termine
    endTurn() {
      this.turnTimer = 0;
      this.updateCircle();
      // On peut lancer automatiquement la validation du tir
      this.validateShot();
    },

    // 🔄 Mise à jour visuelle du cercle
    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDashoffset = circumference - (this.turnTimer / 8) * circumference;
    },
    resetGameState() {
      this.turnTimer = 8;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
      if (this.fetchInterval) clearInterval(this.fetchInterval);
    },
    async initGame() {
      await this.fetchPlayerBoard();

      if (this.is1v1) {
        await this.fetchOpponent(); // uniquement 1v1
      } else {
        await this.fetchOpponents(); // BR ou multi
      }

      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });

      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);

      this.updateCircle();
    },
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
    switchOpponent(index) {
      if (index === this.currentOpponentIndex) return;
      if (this.selectedCell !== null) {
        this.updateGridCell(this.currentOpponent, this.selectedCell, "");
        this.selectedCell = null;
      }
      this.currentOpponentIndex = index;
    },
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
        this.opponentId = data.opponentId;
        this.opponentGrid = Array.from({ length: 100 }, () => "");
      } catch (err) {
        console.error("Erreur fetchOpponent :", err);
      }
    },
    async fetchOpponents() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/opponents?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (data.success) {
          this.opponents = data.opponents.map((opp) => ({
            ...opp,
            grid: Array.from({ length: 100 }, () => ""),
          }));
        }
      } catch (err) {
        console.error("Erreur fetchOpponents:", err);
      }
    },
    updateGridCell(opponent, index, value) {
      if (this.opponents.length > 0) opponent.grid[index] = value;
      else this.opponentGrid[index] = value;
    },
    onShotFired(shot) {
      const idx = shot.y * 10 + shot.x;

      // --- Tir sur notre grille (playerGrid) ---
      if (shot.targetId === this.user.id) {
        const oldCell = this.playerGrid[idx] || { shipNumber: 0, status: "" };
        const newStatus = ["hit", "miss", "sunk"].includes(shot.result) ? shot.result : "selected";
        this.playerGrid[idx] = { ...oldCell, status: newStatus };

        // Si le tir coule un bateau, mettre toutes ses positions à "sunk"
        if (shot.result === "sunk" && shot.positions) {
          shot.positions.forEach((p) => {
            const posIdx = p.y * 10 + p.x;
            const c = this.playerGrid[posIdx] || { shipNumber: 0, status: "" };
            this.playerGrid[posIdx] = { ...c, status: "sunk" };
          });
        }
      }
      // --- Tir sur un adversaire (opponents grid) ---
      else {
        const target = this.opponents.find((o) => o.id === shot.targetId);

        if (target) {
          // Mettre à jour la case en fonction du résultat ou en pending si non résolu
          const newValue = ["hit", "miss", "sunk"].includes(shot.result) ? shot.result : "selected";
          target.grid[idx] = newValue;

          // Si le tir coule un bateau, mettre toutes les positions à "sunk"
          if (shot.result === "sunk" && shot.positions) {
            shot.positions.forEach((p) => {
              const posIdx = p.y * 10 + p.x;
              target.grid[posIdx] = "sunk";
            });
          }
        }
        // Si on n'a pas d'adversaire connu (1v1 classique), mettre à jour opponentGrid par défaut
        else if (!this.opponents.length) {
          const newValue = ["hit", "miss", "sunk"].includes(shot.result) ? shot.result : "selected";
          this.opponentGrid[idx] = newValue;

          if (shot.result === "sunk" && shot.positions) {
            shot.positions.forEach((p) => {
              const posIdx = p.y * 10 + p.x;
              this.opponentGrid[posIdx] = "sunk";
            });
          }
        }
      }

      // Mettre à jour le chrono visuel
      this.updateCircle();
    },

    async selectCell(index) {
      const cellValue = this.currentOpponent.grid[index];
      if (this.gameOver || ["hit", "miss", "sunk", "selected"].includes(cellValue)) return;

      if (this.selectedCell !== null)
        this.updateGridCell(this.currentOpponent, this.selectedCell, "");

      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent, index, "selected");
    },
    async validateShot() {
      if (this.gameOver) return;
      let index = this.selectedCell;
      if (index === null) {
        const available = this.currentOpponent.grid
          .map((v, i) => (v === "" ? i : null))
          .filter((i) => i !== null);
        index = available[Math.floor(Math.random() * available.length)];
      }
      this.currentOpponent.grid = this.currentOpponent.grid.map((c) => (c === "selected" ? "" : c));
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
        if (!data.success) return console.warn("Tir échoué:", data.message);

        // Update la grille immédiatement
        this.updateGridCell(this.currentOpponent, index, data.result);

        if (data.result === "sunk") await this.fetchEnemyShots();
      } catch (err) {
        console.error(err);
      }
    },
    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        const newPlayerGrid = [...this.playerGrid];
        const newOpponentGrid = [...this.opponentGrid];

        data.shots.forEach((s) => {
          const idx = s.y * 10 + s.x;

          const status = s.state === "pending" ? "selected" : s.result;

          if (s.id_player !== this.user.id) {
            // Tir adverse
            const oldCell = newPlayerGrid[idx] || { shipNumber: 0, status: "" };
            newPlayerGrid[idx] = { ...oldCell, status };
            if (s.result === "sunk" && s.positions) {
              s.positions.forEach((p) => {
                const posIdx = p.y * 10 + p.x;
                const c = newPlayerGrid[posIdx] || { shipNumber: 0, status: "" };
                newPlayerGrid[posIdx] = { ...c, status: "sunk" };
              });
            }
          } else {
            // Tir du joueur sur adversaire
            if (this.opponents.length) {
              const target = this.opponents.find((o) => o.id === s.targetId);
              if (target) target.grid[idx] = status;
            } else {
              newOpponentGrid[idx] = status;
            }
          }
        });

        this.playerGrid = newPlayerGrid;
        if (!this.opponents.length) this.opponentGrid = newOpponentGrid;
      } catch (err) {
        console.error("Erreur fetchEnemyShots :", err);
      }
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
        console.error("Erreur checkGameStatus :", err);
      }
    },
    showEndPopup(msg) {
      this.popupMessage = msg;
      this.endPopup = true;
      this.gameOver = true;
    },
    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner la partie ?")) return;

      try {
        const res = await fetch("http://localhost:8080/api/games/eliminate-player", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            reason: "abandon",
          }),
        });

        const data = await res.json();
        if (!data.success) return console.warn("Abandon échoué:", data.message);

        clearInterval(this.fetchInterval);

        if (this.is1v1) {
          this.showEndPopup("💥 Défaite par abandon");
        } else {
          this.showEndPopup("💀 Vous avez abandonné et êtes éliminé");
        }
      } catch (err) {
        console.error(err);
      }
    },

    goHome() {
      this.$router.push("/");
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
