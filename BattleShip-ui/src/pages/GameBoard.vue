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

      <!-- Grille Adversaire -->
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
      playerGrid: Array(100).fill({ shipNumber: 0, status: "" }),
      opponentGrid: Array(100).fill(""),
      turnTimer: 8,
      gameOver: false,
      fetchInterval: null,
      user: JSON.parse(localStorage.getItem("user")),
      selectedCell: null,
      opponentId: null,
      endPopup: false,
      popupMessage: "",
    };
  },
  mounted() {
    this.initGame();
    window.addEventListener("keydown", this.preventRefresh);
    window.addEventListener("popstate", this.preventBack);
    window.addEventListener("beforeunload", this.preventUnload);

    socket.on("connect", () => {
      console.log("⚡ Socket connecté côté client avec l'id", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Erreur connexion socket:", err.message);
    });

    socket.on("turn-timer", ({ timeLeft }) => {
      console.log("⏰ Timer reçu côté client:", timeLeft);
      this.turnTimer = timeLeft;
      const update = () => {
        this.updateCircle();
        if (this.turnTimer > 0) {
          requestAnimationFrame(update);
        }
      };
      requestAnimationFrame(update);
    });

    socket.on("turn-ended", ({ reason }) => {
      console.log("⏳ Tour terminé, raison:", reason);
      this.validateShot();
    });

    socket.on("shot-fired", this.onShotFired);

    socket.on("game-over", ({ winnerId }) => {
      console.log("🏁 Partie terminée, gagnant:", winnerId);
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      this.showEndPopup(winnerId === this.user.id ? "🏆 Victoire !" : "💥 Défaite !");
    });
  },

  beforeUnmount() {
    clearInterval(this.fetchInterval);
    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);

    socket.off("turn-timer");
    socket.off("turn-ended");
    socket.off("shot-fired");
    socket.off("game-over");
  },
  methods: {
    async initGame() {
      await this.fetchOpponent();
      await this.fetchPlayerBoard();

      console.log("📡 emit join-game", this.gameId);
      // 🔌 Rejoindre la room socket **uniquement ici**
      socket.emit("join-game", {
        gameId: this.gameId.toString(),
        playerId: this.user.id,
      });

      // 🔁 polling REST inchangé
      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);
    },

    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (this.turnTimer / 8) * circumference;
      circle.style.strokeDashoffset = offset;
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

    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/board?playerId=${this.user.id}`
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        const flatBoard = data.board.flat();
        this.playerGrid = flatBoard.map((cell) => ({
          shipNumber: typeof cell === "number" && cell > 0 ? cell : 0,
          status: "",
        }));
      } catch (err) {
        console.error("Erreur fetchPlayerBoard :", err);
      }
    },

    async fetchOpponent() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/opponent?playerId=${this.user.id}`
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        this.opponentId = data.opponentId;
        this.opponentGrid = Array.from({ length: 100 }, () => "");
      } catch (err) {
        console.error("Erreur fetchOpponent :", err);
      }
    },

    onShotFired(shot) {
      const idx = shot.y * 10 + shot.x;

      if (shot.shooterId === this.user.id) {
        this.opponentGrid[idx] = shot.result;

        if (shot.result === "sunk" && shot.positions) {
          shot.positions.forEach((p) => {
            this.opponentGrid[p.y * 10 + p.x] = "sunk";
          });
        }
      } else {
        this.playerGrid[idx] = {
          ...this.playerGrid[idx],
          status: shot.result,
        };
      }
    },

    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner la partie ?")) return;
      try {
        const res = await fetch("http://localhost:8080/api/games/abandon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: this.opponentId,
          }),
        });
        const data = await res.json();
        if (!data.success) return console.warn("Abandon échoué:", data.message);

        this.gameOver = true;
        clearInterval(this.timerInterval);
        clearInterval(this.fetchInterval);

        this.showEndPopup("💥 Défaite par abandon !");
      } catch (err) {
        console.error("Erreur abandonGame:", err);
      }
    },

    async selectCell(index) {
      if (this.gameOver) return;
      if (["hit", "miss", "sunk"].includes(this.opponentGrid[index])) return;

      // Efface l'ancienne sélection visuelle
      if (this.selectedCell !== null) {
        this.opponentGrid[this.selectedCell] = "";
      }

      // Définit la nouvelle sélection
      this.selectedCell = index;
      this.opponentGrid[index] = "selected";
    },

    async validateShot() {
      if (this.gameOver) return;

      let index = this.selectedCell;

      // Tir aléatoire si aucune case choisie
      if (index === null) {
        const available = this.opponentGrid
          .map((v, i) => (v === "" ? i : null))
          .filter((i) => i !== null);

        index = available[Math.floor(Math.random() * available.length)];
      }

      // Nettoyage visuel de la sélection
      this.opponentGrid = this.opponentGrid.map((c) => (c === "selected" ? "" : c));

      // Reset sélection pour permettre un nouveau choix après le tir
      this.selectedCell = null;

      await this.sendShoot(index);
    },

    async sendShoot(index) {
      if (this.gameOver) return;

      try {
        const x = index % 10;
        const y = Math.floor(index / 10);

        const res = await fetch("http://localhost:8080/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: this.opponentId,
            x,
            y,
          }),
        });

        const data = await res.json();
        if (!data.success) return console.warn("Tir échoué:", data.message);

        // ⚡ Met à jour la case tirée
        this.opponentGrid[index] = data.result;

        // Met à jour toutes les cases coulées si sunk
        if (data.result === "sunk") {
          await this.fetchEnemyShots();
        }
      } catch (err) {
        console.error(err);
      }
    },

    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/shots?playerId=${this.user.id}`
        );
        const data = await res.json();
        if (!data.success) return;

        const newPlayerGrid = [...this.playerGrid];
        const newOpponentGrid = [...this.opponentGrid];

        data.shots.forEach((s) => {
          const idx = s.y * 10 + s.x;

          if (s.id_player !== this.user.id) {
            // Tir adverse → mettre à jour status seulement
            if (newPlayerGrid[idx]) {
              newPlayerGrid[idx] = {
                ...newPlayerGrid[idx],
                status: s.result,
              };
            }
          } else {
            // Tir joueur sur l'adversaire
            newOpponentGrid[idx] = s.result;

            // Propager sunk sur toutes les positions du bateau
            if (s.result === "sunk" && s.positions) {
              s.positions.forEach((pos) => {
                const posIdx = pos.y * 10 + pos.x;
                newOpponentGrid[posIdx] = "sunk";
              });
            }
          }
        });

        this.playerGrid = newPlayerGrid;
        this.opponentGrid = newOpponentGrid;
      } catch (err) {
        console.error("Erreur fetchEnemyShots :", err);
      }
    },

    async checkGameStatus() {
      try {
        const res = await fetch(
          `http://localhost:8080/api/games/${this.gameId}/status?playerId=${this.user.id}`
        );
        const data = await res.json();
        if (!data.success) return;

        if (data.finished && !this.gameOver) {
          this.gameOver = true;
          clearInterval(this.timerInterval);
          clearInterval(this.fetchInterval);

          let msg = "";

          if (data.winner_id === this.user.id) msg = "🏆 Victoire !";
          else if (data.winner_id === this.opponentId) msg = "💥 Défaite !";
          else msg = "⚔ Égalité !";

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
