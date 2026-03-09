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
    gameType: { type: String, required: true },
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
      hasFiredThisTurn: false,
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
    this.removeSocketListeners();
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
    socket.on("game-over", this.handleGameOver);
    socket.on("game-started", this.handleGameStarted);

    socket.onAny((eventName, ...args) => {
      console.log(`[SOCKET DEBUG] Reçu: ${eventName}`, args);
    });
  },
  beforeUnmount() {
    // 1. Arrêter les appels API vers PHP
    clearInterval(this.fetchInterval);

    // 2. Nettoyer TOUS les écouteurs de socket
    socket.off("turn-timer");
    socket.off("turn-ended");
    socket.off("game-over");

    // 3. Quitter la room sur le serveur
    socket.emit("leave-game", { gameId: this.gameId });
  },
  methods: {
    removeSocketListeners() {
      socket.off("turn-timer", this.socketTurnTimer);
      socket.off("turn-ended", this.endTurn);
      socket.off("shot-fired", this.onShotFired);
      socket.off("player-eliminated", this.onPlayerEliminated);
      socket.off("game-over", this.handleGameOver); // Précis ici aussi
      socket.off("connect"); // Optionnel mais propre
      socket.offAny();
    },
    /* ----------------- Timer ----------------- */
    socketTurnTimer({ timeLeft }) {
      if (timeLeft > this.turnTimer) {
        this.hasFiredThisTurn = false;
      }

      this.turnTimer = timeLeft;
      this.updateCircle();

      if (this.turnTimer <= 0) {
        this.validateShot();
      }
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
      const ratio = Math.max(0, Math.min(this.turnTimer / 7, 1));
      circle.style.strokeDashoffset = circumference - ratio * circumference;
    },

    /* ----------------- Init & Reset ----------------- */
    handleGameStarted(data) {
      console.log("🚀 La partie commence réellement !");
      this.resetGameState();
      this.turnTimer = data.timeLeft || 7;
      this.updateCircle();
    },
    resetGameState() {
      if (this.turnInterval) clearInterval(this.turnInterval);
      if (this.fetchInterval) clearInterval(this.fetchInterval);

      this.fetchInterval = null;
      this.turnInterval = null;
      this.turnTimer = 7;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
      this.playerStatus = "in_game";
    },
    async initGame() {
      console.log("🛠️ Initialisation du jeu...");
      this.resetGameState();
      console.log("📡 Fetching data initial...");
      await this.fetchPlayerBoard();
      if (this.is1v1) await this.fetchOpponent();
      else await this.fetchOpponents();
      console.log(`🏠 Rejoint la salle: ${this.gameId} en tant que ${this.user.id}`);
      // 1. Rejoindre la salle
      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });
      console.log("✅ Envoi du signal 'player-ready'");
      // 2. Signaler que le chargement est fini
      socket.emit("player-ready", { gameId: this.gameId, playerId: this.user.id });

      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);
    },

    /* ----------------- Grilles ----------------- */
    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `https://battleship-api-i276.onrender.com/api/games/${this.gameId}/board?playerId=${this.user.id}`,
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
          `https://battleship-api-i276.onrender.com/api/games/${this.gameId}/opponent?playerId=${this.user.id}`,
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
          `https://battleship-api-i276.onrender.com/api/games/${this.gameId}/opponents?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        // On crée les grilles vides pour chaque adversaire
        this.opponents = data.opponents.map((o) => ({ ...o, grid: Array(100).fill("") }));

        // Sélection automatique du premier adversaire
        this.currentOpponentIndex = 0;
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
      console.log(`[ACTION] Tentative de clic sur cellule ${index}`);
      if (this.gameOver) {
        console.warn("[ACTION BLOQUÉE] La partie est finie (gameOver: true)");
        return;
      }
      const val = this.currentOpponent.grid[index];
      if (["hit", "miss", "sunk", "selected"].includes(val)) {
        console.warn(`[ACTION BLOQUÉE] Cellule déjà occupée par: ${val}`);
        return;
      }
      console.log(`[ACTION OK] Cellule ${index} sélectionnée`);
      if (this.selectedCell !== null)
        this.updateGridCell(this.currentOpponent, this.selectedCell, "");
      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent, index, "selected");
    },
    async validateShot() {
      // On ajoute la vérification du verrou
      if (this.gameOver || this.hasFiredThisTurn) return;

      console.log("[TURN ENDED] Validation du tir");

      let index = this.selectedCell;
      if (index === null) {
        const available = this.currentOpponent.grid
          .map((v, i) => (v === "" ? i : null))
          .filter((i) => i !== null);
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }

      // ON VERROUILLE AVANT L'ENVOI
      this.hasFiredThisTurn = true;

      this.updateGridCell(this.currentOpponent, index, "");
      this.selectedCell = null;
      await this.sendShoot(index);
    },
    async sendShoot(index) {
      if (this.gameOver || this.playerStatus === "dead") return;

      const targetOpponent = this.opponents[this.currentOpponentIndex];
      const x = index % 10;
      const y = Math.floor(index / 10);

      try {
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: targetOpponent.id,
            x: x,
            y: y,
          }),
        });
        const data = await res.json();

        if (data.success) {
          this.applyShot(targetOpponent.id, x, y, data.result, data.positions);
        }
      } catch (err) {
        console.error("Erreur lors de l'envoi du tir:", err);
      }
    },
    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      if (targetId === this.user.id) {
        this.playerGrid[idx].status = result;
        if (positions) {
          positions.forEach((p) => (this.playerGrid[p.y * 10 + p.x].status = "sunk"));
        }
      } else {
        const target = this.opponents.find((o) => o.id === targetId);
        if (target) {
          const newGrid = [...target.grid];
          newGrid[idx] = result;
          if (positions) {
            positions.forEach((p) => (newGrid[p.y * 10 + p.x] = "sunk"));
          }
          target.grid = newGrid;
        }
      }
    },
    onShotFired({ shooterId, targetId, x, y, result, positions }) {
      const idx = y * 10 + x;

      // TIR SUR MOI
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

      // TIR sur adversaire
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
          `https://battleship-api-i276.onrender.com/api/games/${this.gameId}/shots?playerId=${this.user.id}&t=${Date.now()}`,
        );
        const data = await res.json();
        if (!data.success) return;

        // 1. MISE À JOUR DE MA GRILLE (Tirs subis venant du PHP ou Node)
        if (data.incomingShots) {
          const newPlayerGrid = [...this.playerGrid];
          data.incomingShots.forEach((s) => {
            // IMPORTANT : Conversion coordonnées -> Index 0-99
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (newPlayerGrid[idx]) {
              // On ne met à jour que si le tir est résolu (hit/miss/sunk)
              newPlayerGrid[idx].status = s.result;
            }
          });
          this.playerGrid = newPlayerGrid;
        }

        // 2. MISE À JOUR DES GRILLES ADVERSES (Mes tirs vers le PHP ou Node)
        if (data.playerShots) {
          data.playerShots.forEach((s) => {
            const target = this.opponents.find((o) => o.id === s.target_id);
            if (target) {
              const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
              // Si le PHP a calculé le résultat, on l'affiche
              if (s.result) {
                const newOpponentGrid = [...target.grid];
                newOpponentGrid[idx] = s.result;
                target.grid = newOpponentGrid;
              }
            }
          });
        }

        // On vérifie si ces nouveaux tirs m'ont fait perdre
        this.checkDefeat();
      } catch (err) {
        console.error("Erreur Sync Shots (PHP/Node):", err);
      }
    },

    handleGameOver(payload) {
      console.log("🏁 Fin de partie reçue :", payload);
      if (this.gameOver) return;

      this.gameOver = true; // On bloque les actions immédiatement
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);

      let msg = "💥 Défaite !";

      // Correction de la ReferenceError ici :
      if (payload.isDraw) {
        msg = "⚖️ Égalité parfaite !";
      } else if (payload.winnerId === this.user.id) {
        msg = "🏆 Victoire !";
      }

      this.showEndPopup(msg);
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
          `https://battleship-api-i276.onrender.com/api/games/${this.gameId}/status?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        if (data.finished && !this.gameOver) {
          this.gameOver = true;
          clearInterval(this.fetchInterval);
          let msg = "💥 Défaite !";

          if (data.result === "draw") {
            msg = "⚖️ Égalité parfaite !";
          } else if (data.winner === this.user.id) {
            msg = "🏆 Victoire !";
          }

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
        const res = await fetch(
          "https://battleship-api-i276.onrender.com/api/games/eliminate-player",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: this.gameId,
              playerId: this.user.id,
              reason: "abandon",
            }),
          },
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);
        clearInterval(this.fetchInterval);
        this.showEndPopup(this.is1v1 ? "💥 Défaite par abandon" : "💀 Vous avez abandonné");
      } catch (err) {
        console.error(err);
      }
    },
    async checkDefeat() {
      if (this.playerStatus !== "in_game") return;

      const shipCells = this.playerGrid.filter((c) => c.shipNumber > 0);
      if (!shipCells.length) return;

      const allDestroyed = shipCells.every((c) => c.status === "hit" || c.status === "sunk");
      if (!allDestroyed) return;

      this.playerStatus = "dead";

      try {
        const res = await fetch(
          "https://battleship-api-i276.onrender.com/api/games/eliminate-player",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: this.gameId,
              playerId: this.user.id,
              reason: "shot",
            }),
          },
        );
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        // Afficher popup si c'est la fin du jeu ou défaite
        if (data.finished) {
          const msg =
            data.winner_id === this.user.id
              ? "🏆 Victoire !"
              : data.winner_id === null
                ? "⚖️ Égalité parfaite !"
                : "💥 Défaite !";
          this.showEndPopup(msg);
        } else {
          // Joueur éliminé mais la partie continue
          this.showEndPopup("💥 Tous vos bateaux sont coulés !");
        }
      } catch (err) {
        console.error(err);
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
