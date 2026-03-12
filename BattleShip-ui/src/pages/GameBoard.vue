<template>
  <div class="battle-container">
    <div class="header-actions">
      <button class="btn-abandon" @click="abandonGame" title="Abandonner la partie">
        <span class="btn-text">Abandonner</span>
        <span class="btn-icon">✕</span>
      </button>
    </div>

    <div class="grids-wrapper">
      <div class="grid-section player-section">
        <h2 class="grid-title">Notre flotte</h2>
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
          ></div>
        </div>
      </div>

      <div class="timer-container">
        <div class="timer-circle">
          <svg class="progress-ring" width="100" height="100">
            <circle
              class="progress-ring__circle"
              stroke="white"
              stroke-width="6"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
          </svg>
          <div class="timer-text">{{ turnTimer }}s</div>
        </div>
      </div>

      <div class="grid-section opponent-section">
        <h2 class="grid-title">
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
    <div v-if="endPopup" class="popup-overlay">
      <div class="popup-content">
        <h2>Fin de la partie</h2>
        <p>{{ popupMessage }}</p>
        <button class="btn-home" @click="goHome">Retour à l'accueil</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
html,
body {
  max-width: 100%;
  overflow-x: hidden;
  /* Optionnel : empêche le rebond élastique sur iOS */
  position: relative;
}
/* CONTENEUR PRINCIPAL */
.battle-container {
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at center, #1b2735 0%, #090a0f 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 10px 40px 10px;
  color: white;
  font-family: "Orbitron", sans-serif;
  box-sizing: border-box;
  position: relative;
}

/* GESTION DU BOUTON ABANDONNER (PC) */
.header-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.btn-abandon {
  width: auto;
  min-width: 140px;
  padding: 10px 20px;
  background: rgba(198, 40, 40, 0.1);
  border: 1px solid #ff4444;
  border-radius: 5px;
  color: #ff4444;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-abandon:hover {
  background: #c62828;
  color: white;
  box-shadow: 0 0 15px rgba(198, 40, 40, 0.5);
}

.btn-icon {
  display: none;
}

/* WRAPPER DES GRILLES */
.grids-wrapper {
  display: flex;
  gap: 40px;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  justify-content: center;
  flex-wrap: wrap; /* Important pour le passage à la ligne sur mobile */
  overflow: hidden;
}

.grid-section {
  flex: 1 1 300px; /* Permet de réduire la section si nécessaire */
  width: 100%;
  max-width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-title {
  font-size: 1.1rem;
  margin-bottom: 15px;
  text-transform: uppercase;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

/* LA GRILLE */
.grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr); /* 👈 AJOUT ICI */
  gap: 2px;
  background: rgba(0, 212, 255, 0.15);
  padding: 4px;
  border: 1px solid rgba(0, 212, 255, 0.4);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);

  width: 100%;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}
/* LES CELLULES */
.cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1; /* 👈 REMETS CECI ICI */
  background: rgba(10, 25, 47, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  /* Optionnel mais recommandé pour empêcher le contenu de déborder : */
  overflow: hidden;
}

/* ETATS DES CELLULES */
.player-grid .cell.ship {
  background: #1e3a5f;
  border: 1px solid #00d4ff;
  box-shadow: inset 0 0 8px rgba(0, 212, 255, 0.3);
}

.cell.hit {
  background: radial-gradient(circle, #ff4444 30%, #7f0000 100%) !important;
  box-shadow: 0 0 12px #ff4444;
  z-index: 1;
}

.cell.miss::after {
  content: "";
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.cell.sunk {
  background: #1a1a1a !important;
  border: 1px solid #444;
}

.cell.sunk::after {
  content: "✕";
  color: #ff4444;
  font-size: 1.1rem;
  font-weight: bold;
  opacity: 0.7;
}

.cell.selected {
  background: rgba(255, 235, 59, 0.2) !important;
  outline: 2px solid #ffeb3b;
  z-index: 2;
}

/* TIMER / CHRONO */
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120px;
}

.timer-circle {
  width: 100px;
  height: 100px;
  position: relative;
}

.progress-ring {
  transform: rotate(-90deg);
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

/* DROP DOWN ADVERSAIRE */
.opponent-dropdown {
  background: #0a192f;
  color: #00d4ff;
  border: 1px solid #00d4ff;
  padding: 4px 8px;
  font-family: "Orbitron";
  font-size: 0.8rem;
  border-radius: 4px;
  margin-left: 10px;
}

/* RESPONSIVE (MOBILE & TABLETTE) */
@media (max-width: 850px) {
  .battle-container {
    padding-top: 80px; /* Espace pour le bouton en haut */
  }

  /* Bouton devient un cercle en haut à droite */
  .header-actions {
    top: 15px;
    right: 15px;
  }

  .btn-abandon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    padding: 0;
    border-radius: 50%;
  }

  .btn-text {
    display: none;
  }
  .btn-icon {
    display: block;
    font-size: 1.4rem;
    font-weight: bold;
  }

  /* RE-ORGANISATION DES ELEMENTS SUR MOBILE */
  .grids-wrapper {
    flex-direction: column;
    gap: 10px; /* Réduit l'espace entre les éléments pour gagner de la place */
    padding: 0 5px;
  }

  .grid-title {
    font-size: 0.9rem; /* Titre un peu plus petit sur mobile */
    margin-bottom: 8px;
  }

  .player-section {
    order: 1; /* Notre flotte en premier */
  }

  .timer-container {
    order: 2;
    margin: 5px 0;
    /* On réduit un peu le chrono sur mobile pour laisser la place aux grilles */
    transform: scale(0.85);
  }

  .opponent-section {
    order: 3; /* L'adversaire en dernier */
  }

  .grid-section {
    /* La grille prend 92% de la largeur du téléphone */
    max-width: 92vw;
    margin: 0 auto;
  }
}

/* POPUP DE FIN */
.end-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.popup-overlay {
  position: fixed; /* Crucial : détache la popup du flux normal */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85); /* Fond noir semi-transparent */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000; /* Doit être supérieur à tout le reste (grilles, timer) */
  backdrop-filter: blur(5px); /* Optionnel : floute le jeu derrière */
}

.popup-content {
  background: #0a192f;
  padding: 40px;
  border: 2px solid #00d4ff;
  border-radius: 15px;
  text-align: center;
  max-width: 400px;
  width: 90%; /* Évite de déborder sur mobile */
  box-shadow: 0 0 50px rgba(0, 212, 255, 0.4);
}

.btn-home {
  margin-top: 25px;
  padding: 12px 30px;
  background: #00d4ff;
  border: none;
  border-radius: 5px;
  color: #0a192f;
  font-weight: bold;
  cursor: pointer;
  font-family: "Orbitron";
  text-transform: uppercase;
  transition: transform 0.2s;
}

.btn-home:hover {
  transform: scale(1.05);
}

/* --- Modifie ces classes dans ton style existant --- */

.progress-ring {
  transform: rotate(-90deg);
  /* Optionnel : ajoute une transition fluide pour que le cercle ne saute pas */
  transition: stroke-dashoffset 0.3s linear;
}

.progress-ring__circle {
  /* La circonférence pour un rayon de 45 est 2 * PI * 45 ≈ 282.7 */
  stroke-dasharray: 282.7;
  stroke-dashoffset: 0; /* 0 = cercle complet */
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
}

/* Optionnel : change la couleur en rouge quand il reste peu de temps */
.timer-low {
  stroke: #ff4444 !important;
  filter: drop-shadow(0 0 5px #ff4444);
}
</style>

<script>
import socket from "../services/socket.js";

// Centralisation de l'URL de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL;

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
      turnTimer: 7,
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
      if (this.gameOver) return;
      console.log(`[SOCKET DEBUG] Reçu: ${eventName}`, args);
    });
  },
  beforeUnmount() {
    console.log("🧹 Destruction GameBoard");
    clearInterval(this.fetchInterval);
    clearInterval(this.turnInterval);
    this.removeSocketListeners();

    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);
  },
  methods: {
    removeSocketListeners() {
      console.log("🧹 Nettoyage socket");
      socket.emit("leave-game", { gameId: this.gameId });

      socket.off("turn-timer", this.socketTurnTimer);
      socket.off("turn-ended", this.endTurn);
      socket.off("shot-fired", this.onShotFired);
      socket.off("player-eliminated", this.onPlayerEliminated);
      socket.off("game-over", this.handleGameOver);
      socket.off("game-started", this.handleGameStarted);
      socket.offAny();
    },

    /* ----------------- Timer ----------------- */
    socketTurnTimer({ timeLeft }) {
      if (this.gameOver) return;

      if (timeLeft >= 7) {
        this.hasFiredThisTurn = false;
        this.turnTimer = 7;
      } else {
        this.turnTimer = timeLeft;
      }
      this.$nextTick(this.updateCircle);
    },
    endTurn() {
      if (this.gameOver) return;
      this.turnTimer = 0;
      this.updateCircle();
      this.validateShot();
      this.hasFiredThisTurn = false;
    },
    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      if (!circle) return;
      const radius = 45;
      const circumference = 2 * Math.PI * radius;
      const ratio = Math.max(0, Math.min(this.turnTimer / 7, 1));
      const offset = circumference - ratio * circumference;
      circle.style.transition = this.turnTimer === 7 ? "none" : "stroke-dashoffset 1s linear";
      circle.style.strokeDashoffset = offset;
    },

    /* ----------------- Init & Reset ----------------- */
    handleGameStarted(data) {
      console.log("🚀 La partie commence !");
      this.resetGameState();
      this.turnTimer = data.timeLeft || 7;
      this.updateCircle();
    },
    resetGameState() {
      clearInterval(this.turnInterval);
      clearInterval(this.fetchInterval);

      this.fetchInterval = null;
      this.turnInterval = null;
      this.turnTimer = 7;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
      this.playerStatus = "in_game";
      this.hasFiredThisTurn = false;
    },
    async initGame() {
      console.log("🛠️ Initialisation du jeu...");
      this.resetGameState();
      await this.fetchPlayerBoard();

      if (this.is1v1) await this.fetchOpponent();
      else await this.fetchOpponents();

      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });
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
          `${API_BASE_URL}/api/games/${this.gameId}/board?playerId=${this.user.id}`,
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
          `${API_BASE_URL}/api/games/${this.gameId}/opponent?playerId=${this.user.id}`,
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
          `${API_BASE_URL}/api/games/${this.gameId}/opponents?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        this.opponents = data.opponents.map((o) => ({ ...o, grid: Array(100).fill("") }));
        this.currentOpponentIndex = 0;
      } catch (err) {
        console.error(err);
      }
    },
    updateGridCell(opponent, index, value) {
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
      if (this.gameOver || this.hasFiredThisTurn) return;
      let index = this.selectedCell;
      if (index === null) {
        const available = this.currentOpponent.grid
          .map((v, i) => (v === "" ? i : null))
          .filter((i) => i !== null);
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }
      this.hasFiredThisTurn = true;
      this.updateGridCell(this.currentOpponent, index, "");
      this.selectedCell = null;
      await this.sendShoot(index);
    },
    onPlayerEliminated(data) {
      console.log("💀 Joueur éliminé:", data);

      // Si c'est MOI qui suis éliminé par le serveur (ex: déconnexion ou destruction)
      if (data.playerId === this.user.id) {
        this.playerStatus = "dead";
        const msg =
          data.reason === "abandon" ? "🏳️ Éliminé par abandon" : "💥 Tous vos navires ont coulé !";
        this.showEndPopup(msg);
        return;
      }

      this.opponents = this.opponents.filter((opp) => opp.id !== data.playerId);

      if (this.currentOpponentIndex >= this.opponents.length) {
        this.currentOpponentIndex = 0;
      }
    },
    async sendShoot(index) {
      if (this.gameOver || this.playerStatus === "dead") return;

      const targetOpponent = this.opponents[this.currentOpponentIndex];
      if (!targetOpponent?.id || index == null || index < 0 || index > 99) {
        console.warn("Tir annulé : coordonnées ou cible invalides", { index, targetOpponent });
        this.selectedCell = null;
        return;
      }

      const x = index % 10;
      const y = Math.floor(index / 10);

      try {
        const res = await fetch(`${API_BASE_URL}/api/games/shoot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: targetOpponent.id,
            x,
            y,
          }),
        });

        const data = await res.json();
        if (!data.success) return console.warn("Tir refusé :", data.message);

        this.applyShot(targetOpponent.id, x, y, data.result, data.positions);
        this.selectedCell = null;
      } catch (err) {
        console.error(err);
        this.selectedCell = null;
      }
    },
    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      if (targetId === this.user.id) {
        this.playerGrid[idx].status = result;
        positions?.forEach((p) => (this.playerGrid[p.y * 10 + p.x].status = "sunk"));
      } else {
        const target = this.opponents.find((o) => o.id === targetId);
        if (!target) return;
        const newGrid = [...target.grid];
        newGrid[idx] = result;
        positions?.forEach((p) => (newGrid[p.y * 10 + p.x] = "sunk"));
        target.grid = newGrid;
      }
    },
    onShotFired({ shooterId, targetId, x, y, result, positions }) {
      const idx = y * 10 + x;
      if (targetId === this.user.id) {
        const newGrid = [...this.playerGrid];
        newGrid[idx].status = result;
        positions?.forEach((p) => (newGrid[p.y * 10 + p.x].status = "sunk"));
        this.playerGrid = newGrid;
        this.checkDefeat();
        return;
      }
      const target = this.opponents.find((o) => o.id === targetId);
      if (!target) return;
      const newGrid = [...target.grid];
      newGrid[idx] = result;
      positions?.forEach((p) => (newGrid[p.y * 10 + p.x] = "sunk"));
      target.grid = newGrid;
    },

    /* ----------------- Enemy shots ----------------- */
    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/shots?playerId=${this.user.id}&t=${Date.now()}`,
        );
        const data = await res.json();
        if (!data.success) return;

        if (data.incomingShots) {
          const newGrid = [...this.playerGrid];
          data.incomingShots.forEach((s) => {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (newGrid[idx]) newGrid[idx].status = s.result;
          });
          this.playerGrid = newGrid;
        }

        if (data.playerShots) {
          data.playerShots.forEach((s) => {
            const target = this.opponents.find((o) => o.id === s.target_id);
            if (!target) return;
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            target.grid[idx] = s.result;
          });
        }

        this.checkDefeat();
      } catch (err) {
        console.error("Erreur Sync Shots:", err.message);
      }
    },

    /* ----------------- Game Over / Abandon ----------------- */
    handleGameOver(payload) {
      if (this.gameOver) return;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();

      let msg = payload.isDraw
        ? "⚖️ Égalité parfaite !"
        : payload.winnerId === this.user.id
          ? "🏆 Victoire !"
          : "💥 Défaite !";

      this.showEndPopup(msg);
    },
    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner ?")) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/eliminate-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            reason: "abandon",
          }),
        });
        const data = await res.json();

        if (data.success) {
          // ACTION IMMEDIATE : On marque le joueur comme mort et on affiche la popup
          this.playerStatus = "dead";
          this.showEndPopup("🏳️ Abandon confirmé. Vous avez quitté la partie.");
        } else {
          console.warn(data.message);
        }
      } catch (err) {
        console.error(err);
      }
    },
    showEndPopup(msg, force = false) {
      this.popupMessage = msg;
      this.endPopup = true;
      if (!force) this.gameOver = true;

      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);

      if (!force) this.removeSocketListeners();

      this.turnTimer = 7;
      this.updateCircle();
    },

    async checkDefeat() {
      if (this.playerStatus !== "in_game") return;
      const shipCells = this.playerGrid.filter((c) => c.shipNumber > 0);
      if (!shipCells.length) return;
      const allDestroyed = shipCells.every((c) => c.status === "hit" || c.status === "sunk");
      if (!allDestroyed) return;

      this.playerStatus = "dead";
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/eliminate-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, reason: "shot" }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        if (data.finished) {
          const msg =
            data.winner_id === this.user.id
              ? "🏆 Victoire !"
              : data.winner_id === null
                ? "⚖️ Égalité parfaite !"
                : "💥 Défaite !";
          this.showEndPopup(msg);
        } else {
          this.showEndPopup("💥 Tous vos bateaux sont coulés !");
        }
      } catch (err) {
        console.error(err);
      }
    },

    /* ----------------- Navigation ----------------- */
    goHome() {
      this.$router.push("/");
    },
    preventRefresh(e) {
      e.preventDefault();
    },
    preventBack(e) {
      e.preventDefault();
    },
    preventUnload(e) {
      e.preventDefault();
    },
  },
};
</script>
