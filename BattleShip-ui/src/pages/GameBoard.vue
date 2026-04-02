<template>
  <div class="battle-container">
    <div class="header-actions">
      <button class="btn-abandon" @click="abandonGame" title="Abandonner la partie">
        <span class="btn-text">Abandonner</span>
        <span class="btn-icon">✕</span>
      </button>
    </div>
    <div v-if="isSpectator && !gameOver" class="spectator-banner">
      👁️ Vous êtes éliminé — vous observez la partie
    </div>

    <!-- MODE ÉQUIPE : layout gauche/droite -->
    <div v-if="isTeamMode" class="grids-wrapper team-layout">
      <!-- GAUCHE : ma grille + grilles alliés -->
      <div class="team-left">
        <div class="grid-section player-section">
          <h2 class="grid-title">Ma flotte</h2>
          <div class="grid player-grid">
            <div
              v-for="(cell, index) in playerGrid"
              :key="'me-' + index"
              class="cell"
              :class="{
                ship: cell.shipNumber && cell.shipNumber !== 0,
                hit: cell.status === 'hit',
                miss: cell.status === 'miss',
                sunk: cell.status === 'sunk',
                pending: cell.status === 'pending',
              }"
            ></div>
          </div>
        </div>

        <div v-for="ally in allies" :key="'ally-' + ally.id" class="grid-section ally-section">
          <h2 class="grid-title ally-title">🤝 {{ ally.pseudo }}</h2>
          <div class="grid ally-grid">
            <div
              v-for="(cell, index) in ally.grid"
              :key="'ally-cell-' + index"
              class="cell ally-cell"
              :class="{
                hit: cell === 'hit',
                miss: cell === 'miss',
                sunk: cell === 'sunk',
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- CENTRE : timer -->
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

      <!-- DROITE : grilles ennemies -->
      <div class="team-right">
        <div
          v-for="(enemy, i) in enemies"
          :key="'enemy-' + enemy.id"
          class="grid-section enemy-section"
        >
          <h2
            class="grid-title enemy-title"
            :class="{ 'active-target': currentOpponentIndex === i }"
            @click="currentOpponentIndex = i"
            style="cursor: pointer"
          >
            ⚔️ {{ enemy.pseudo }}
            <span v-if="currentOpponentIndex === i" class="target-indicator"> ◀ Ciblé</span>
          </h2>
          <div class="grid opponent-grid">
            <div
              v-for="(cell, index) in enemy.grid"
              :key="'enemy-cell-' + index"
              class="cell"
              :class="{
                hit: cell === 'hit',
                miss: cell === 'miss',
                sunk: cell === 'sunk',
                selected: cell === 'selected',
                pending: cell === 'pending',
              }"
              @click="selectEnemyCell(i, index)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODE 1v1 / BATTLE ROYALE : layout original inchangé -->
    <div v-else class="grids-wrapper">
      <div class="grid-section player-section">
        <h2 class="grid-title">Notre flotte</h2>
        <div class="grid player-grid">
          <div
            v-for="(cell, index) in playerGrid"
            :key="'me-' + index"
            class="cell"
            :class="{
              ship: cell.shipNumber && cell.shipNumber !== 0,
              hit: cell.status === 'hit',
              miss: cell.status === 'miss',
              sunk: cell.status === 'sunk',
              pending: cell.status === 'pending',
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
            :key="'opp-cell-' + index"
            class="cell"
            :class="{
              hit: cell === 'hit',
              miss: cell === 'miss',
              sunk: cell === 'sunk',
              selected: cell === 'selected',
              pending: cell === 'pending',
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

<script>
import socket from "../services/socket.js";
import heartbeatSrc from "@/assets/audio/BattementsDeCoeur.mp3";

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
      opponents: [], // tous les autres joueurs (1v1 / BR)
      allies: [], // coéquipiers (mode équipe)
      enemies: [], // adversaires (mode équipe)
      myTeamNumber: null,
      currentOpponentIndex: 0,
      turnTimer: 7,
      gameOver: false,
      fetchInterval: null,
      turnInterval: null,
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      selectedCell: null,
      selectedEnemyIndex: 0, // quel ennemi on cible en mode équipe
      endPopup: false,
      popupMessage: "",
      playerStatus: "in_game",
      hasFiredThisTurn: false,
      isSelecting: false,
      heartbeatAudio: null,
      detectedTeamMode: false,
      isSpectator: false,
    };
  },
  computed: {
    isTeamMode() {
      return ["2v2", "3v3", "4v4"].includes(this.gameType) || this.detectedTeamMode;
    },
    is1v1() {
      return this.gameType === "1v1";
    },
    // Utilisé en mode 1v1/BR
    currentOpponent() {
      return (
        this.opponents[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
    // Ennemi actuellement ciblé en mode équipe
    currentEnemy() {
      return (
        this.enemies[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
  },
  watch: {
    playerGrid: {
      deep: true,
      handler() {
        this.updateHeartbeatSpeed();
      },
    },
    gameOver(val) {
      if (val) this.stopHeartbeat();
    },
  },
  mounted() {
    this.removeSocketListeners();
    this.initGame();
    this.initAudio();
    this.playHeartbeat();

    socket.on("connect", () => console.log("⚡ Socket connecté"));

    socket.on("turn-timer", (data) => {
      if (data.timeLeft >= 7) this.clearPendingCells();
      this.socketTurnTimer(data);
    });

    socket.on("turn-ended", () => this.endTurn());
    socket.on("shot-fired", (data) => this.onShotFired(data));
    socket.on("player-eliminated", (data) => this.onPlayerEliminated(data));
    socket.on("game-over", (data) => this.handleGameOver(data));
    socket.on("game-started", (data) => this.handleGameStarted(data));

    socket.on("cell-pending", (data) => {
      const { targetId, index, shooterId } = data;
      if (shooterId === this.user.id) return;
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      const opponent = pool.find((o) => o.id === targetId);
      if (opponent) this.updateGridCell(opponent, index, "pending");
    });

    socket.on("cell-unlocked", (data) => {
      const { targetId, index } = data;
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      const opponent = pool.find((o) => o.id === targetId);
      if (opponent && opponent.grid[index] === "pending") {
        this.updateGridCell(opponent, index, "");
      }
    });
  },
  beforeUnmount() {
    clearInterval(this.fetchInterval);
    clearInterval(this.turnInterval);
    this.removeSocketListeners();
    this.stopHeartbeat();
  },
  methods: {
    removeSocketListeners() {
      socket.off("turn-timer");
      socket.off("turn-ended");
      socket.off("shot-fired");
      socket.off("player-eliminated");
      socket.off("game-over");
      socket.off("game-started");
      socket.off("cell-pending");
      socket.off("cell-unlocked");
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

    /* ----------------- Init ----------------- */
    handleGameStarted(data) {
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
      this.isSelecting = false;
    },
    async initGame() {
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

        this.myTeamNumber = data.myTeamNumber ?? null;
        const all = data.opponents.map((o) => ({ ...o, grid: Array(100).fill("") }));

        // Mode équipe détecté si myTeamNumber est non null
        if (this.myTeamNumber !== null) {
          this.detectedTeamMode = true;

          this.allies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) === Number(this.myTeamNumber),
          );
          this.enemies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) !== Number(this.myTeamNumber),
          );
          this.opponents = all; // référence complète pour applyShot/onShotFired
          this.currentOpponentIndex = 0;
        } else {
          // BR : logique de rotation inchangée
          this.detectedTeamMode = false;
          this.opponents = all;
          this.allies = [];
          this.enemies = [];
          if (all.length > 0) {
            const allIds = [...all.map((o) => Number(o.id)), Number(this.user.id)].sort(
              (a, b) => a - b,
            );
            const myIndex = allIds.indexOf(Number(this.user.id));
            const targetId = allIds[(myIndex + 1) % allIds.length];
            const finalIndex = all.findIndex((o) => Number(o.id) === Number(targetId));
            this.currentOpponentIndex = finalIndex !== -1 ? finalIndex : 0;
          }
        }
      } catch (err) {
        console.error("Erreur fetchOpponents:", err);
      }
    },
    updateGridCell(opponent, index, value) {
      const newGrid = [...opponent.grid];
      newGrid[index] = value;
      opponent.grid = newGrid;
    },

    async checkGameStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/${this.gameId}/status`);
        const data = await res.json();
        if (!data.success) return;

        if (data.status === "finished" && !this.gameOver) {
          this.handleGameOver({
            winnerId: data.winner_id,
            winnerTeam: data.winner_team ?? null,
            isDraw: data.winner_id === null && data.winner_team === null,
          });
        }
      } catch (err) {
        console.error("Erreur checkGameStatus:", err);
      }
    },

    /* ----------------- Sélection & Tir ----------------- */

    // Mode 1v1 / BR — inchangé
    selectCell(index) {
      if (
        this.gameOver ||
        this.playerStatus === "dead" ||
        this.hasFiredThisTurn ||
        this.isSelecting ||
        this.turnTimer === 0
      )
        return;

      const val = this.currentOpponent.grid[index];
      if (["hit", "miss", "sunk", "pending"].includes(val)) return;
      if (this.selectedCell === index) return;

      this.isSelecting = true;

      if (this.selectedCell !== null) {
        const oldIndex = this.selectedCell;
        this.updateGridCell(this.currentOpponent, oldIndex, "");
        socket.emit("unlock-cell", {
          gameId: this.gameId,
          targetId: this.currentOpponent.id,
          index: oldIndex,
          shooterId: this.user.id,
        });
      }

      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent, index, "selected");
      socket.emit("lock-cell", {
        gameId: this.gameId,
        targetId: this.currentOpponent.id,
        index,
        shooterId: this.user.id,
      });

      setTimeout(() => {
        this.isSelecting = false;
      }, 150);
    },

    // Mode équipe — cliquer sur la grille d'un ennemi précis
    selectEnemyCell(enemyIndex, cellIndex) {
      if (
        this.gameOver ||
        this.playerStatus === "dead" ||
        this.hasFiredThisTurn ||
        this.isSelecting ||
        this.turnTimer === 0
      )
        return;

      const enemy = this.enemies[enemyIndex];
      if (!enemy) return;

      const val = enemy.grid[cellIndex];
      if (["hit", "miss", "sunk", "pending"].includes(val)) return;

      this.isSelecting = true;

      // Dé-sélectionner la cellule précédente si elle existe
      if (this.selectedCell !== null) {
        const prevEnemy = this.enemies[this.currentOpponentIndex];
        if (prevEnemy) {
          this.updateGridCell(prevEnemy, this.selectedCell, "");
          socket.emit("unlock-cell", {
            gameId: this.gameId,
            targetId: prevEnemy.id,
            index: this.selectedCell,
            shooterId: this.user.id,
          });
        }
      }

      this.currentOpponentIndex = enemyIndex;
      this.selectedCell = cellIndex;
      this.updateGridCell(enemy, cellIndex, "selected");
      socket.emit("lock-cell", {
        gameId: this.gameId,
        targetId: enemy.id,
        index: cellIndex,
        shooterId: this.user.id,
      });

      setTimeout(() => {
        this.isSelecting = false;
      }, 150);
    },

    clearPendingCells() {
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      pool.forEach((opp) => {
        opp.grid = opp.grid.map((cell) => (cell === "pending" || cell === "selected" ? "" : cell));
      });
      this.selectedCell = null;
    },

    async validateShot() {
      if (this.gameOver || this.hasFiredThisTurn || this.playerStatus === "dead") return;

      const targetPool = this.isTeamMode ? this.enemies : this.opponents;
      const target = targetPool[this.currentOpponentIndex];
      if (!target) return;

      let index = this.selectedCell;
      if (index === null) {
        const available = [];
        target.grid.forEach((v, i) => {
          if (!["hit", "miss", "sunk"].includes(v)) available.push(i);
        });
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }

      this.hasFiredThisTurn = true;
      await this.sendShoot(index, target);
    },

    onPlayerEliminated(data) {
      if (data.playerId === this.user.id) {
        if (this.playerStatus === "dead") return; // déjà traité par checkDefeat
        this.playerStatus = "dead";
        if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          const msg =
            data.reason === "abandon"
              ? "🏳️ Éliminé par abandon"
              : "💥 Tous vos navires ont coulé !";
          this.showEndPopup(msg);
        }
        return;
      }

      if (this.isTeamMode) {
        const wasCurrentEnemy = this.enemies[this.currentOpponentIndex]?.id === data.playerId;
        this.enemies = this.enemies.filter((o) => o.id !== data.playerId);
        this.allies = this.allies.filter((o) => o.id !== data.playerId);
        if (wasCurrentEnemy && this.currentOpponentIndex >= this.enemies.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      } else {
        const isCurrentTarget = this.opponents[this.currentOpponentIndex]?.id === data.playerId;
        this.opponents = this.opponents.filter((opp) => opp.id !== data.playerId);
        if (isCurrentTarget || this.currentOpponentIndex >= this.opponents.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      }
      this.opponents = this.opponents.filter((o) => o.id !== data.playerId);
    },

    async sendShoot(index, targetOverride = null) {
      const target = targetOverride || (this.isTeamMode ? this.currentEnemy : this.currentOpponent);
      const x = index % 10;
      const y = Math.floor(index / 10);

      try {
        const res = await fetch(`${API_BASE_URL}/api/games/shoot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: this.user.id,
            targetId: target.id,
            x,
            y,
          }),
        });

        const data = await res.json();
        if (data.success) {
          this.applyShot(target.id, x, y, data.result || "pending", data.positions);
        }
        this.selectedCell = null;
      } catch (err) {
        console.error("Erreur sendShoot:", err);
      }
    },

    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      const resClean = String(result).toLowerCase();

      if (String(targetId) === String(this.user.id)) {
        const newGrid = [...this.playerGrid];
        newGrid[idx] = { ...newGrid[idx], status: resClean };
        positions?.forEach((p) => {
          newGrid[p.y * 10 + p.x] = { ...newGrid[p.y * 10 + p.x], status: "sunk" };
        });
        this.playerGrid = newGrid;
      } else {
        // Chercher dans opponents (contient tout le monde)
        const target = this.opponents.find((o) => String(o.id) === String(targetId));
        if (target) {
          const newGrid = [...target.grid];
          newGrid[idx] = resClean;
          positions?.forEach((p) => (newGrid[p.y * 10 + p.x] = "sunk"));
          target.grid = newGrid;
        }
      }
    },

    onShotFired(data) {
      const { targetId, x, y, result, positions } = data;
      const idx = parseInt(y) * 10 + parseInt(x);
      const safeResult = result ? String(result).toLowerCase() : "pending";

      if (String(targetId) === String(this.user.id)) {
        const newGrid = [...this.playerGrid];
        newGrid[idx] = { ...newGrid[idx], status: safeResult };
        if (positions) {
          positions.forEach((p) => {
            const pIdx = p.y * 10 + p.x;
            if (newGrid[pIdx]) newGrid[pIdx] = { ...newGrid[pIdx], status: "sunk" };
          });
        }
        this.playerGrid = newGrid;
        this.checkDefeat();
      } else {
        const target = this.opponents.find((o) => String(o.id) === String(targetId));
        if (target) {
          const newGrid = [...target.grid];
          newGrid[idx] = safeResult;
          if (positions) positions.forEach((p) => (newGrid[p.y * 10 + p.x] = "sunk"));
          target.grid = newGrid;
        }
      }
    },

    async fetchEnemyShots() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!data || !data.success) return;

        // Ma grille — tirs reçus
        const incomingShots = data.incomingShots || [];
        if (incomingShots.length > 0) {
          const updatedGrid = [...this.playerGrid];
          let changed = false;

          incomingShots.forEach((s) => {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (!updatedGrid[idx]) return;
            const current = updatedGrid[idx].status;
            const incoming = s.result ? String(s.result).toLowerCase() : null;

            if (!incoming) {
              if (current === "") {
                updatedGrid[idx] = { ...updatedGrid[idx], status: "pending" };
                changed = true;
              }
              return;
            }
            if (current === "" || current === "pending") {
              updatedGrid[idx] = { ...updatedGrid[idx], status: incoming };
              changed = true;
            }
            if (incoming === "sunk" && s.positions) {
              s.positions.forEach((p) => {
                const pIdx = p.y * 10 + p.x;
                if (updatedGrid[pIdx] && updatedGrid[pIdx].status !== "sunk") {
                  updatedGrid[pIdx] = { ...updatedGrid[pIdx], status: "sunk" };
                  changed = true;
                }
              });
            }
          });

          if (changed) {
            this.playerGrid = updatedGrid;
            this.$nextTick(() => this.checkDefeat());
          }
        }

        // Mes tirs sur les ennemis
        const myShots = data.playerShots || [];
        myShots.forEach((s) => {
          const target = this.opponents.find((o) => String(o.id) === String(s.target_id));
          if (target && s.result) {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (target.grid[idx] === "" || target.grid[idx] === "selected") {
              this.updateGridCell(target, idx, String(s.result).toLowerCase());
            }
          }
        });

        // Tirs reçus par les alliés (mode équipe)
        if (this.isTeamMode && data.allShots) {
          this.allies.forEach((ally) => {
            const allyShots = data.allShots.filter(
              (s) => Number(s.target_id) === Number(ally.id) && s.result && s.state === "resolved",
            );
            if (!allyShots.length) return;

            const newGrid = [...ally.grid];
            allyShots.forEach((s) => {
              const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
              const result = String(s.result).toLowerCase();
              if (newGrid[idx] === "" || newGrid[idx] === "pending") {
                newGrid[idx] = result;
              }
              if (result === "sunk" && s.positions) {
                s.positions.forEach((p) => {
                  newGrid[p.y * 10 + p.x] = "sunk";
                });
              }
            });
            ally.grid = newGrid;
          });
        }
      } catch (err) {
        console.error("Erreur Sync Shots:", err);
      }
    },

    /* ----------------- Game Over / Abandon ----------------- */
    handleGameOver(payload) {
      if (this.gameOver) return;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();

      let msg;
      if (payload.isDraw) {
        msg = "⚖️ Égalité parfaite !";
      } else if (this.isTeamMode && payload.winnerTeam != null) {
        msg =
          Number(payload.winnerTeam) === Number(this.myTeamNumber)
            ? "🏆 Victoire !"
            : "💥 Défaite !";
      } else {
        msg = String(payload.winnerId) === String(this.user.id) ? "🏆 Victoire !" : "💥 Défaite !";
      }

      this.showEndPopup(msg);
    },

    async abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner ?")) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/eliminate-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.user.id, reason: "abandon" }),
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message);

        this.playerStatus = "dead";
        if (data.finished) {
          const myTeamWon = this.isTeamMode ? data.winner_team === this.myTeamNumber : false;
          this.showEndPopup(myTeamWon ? "🏆 Victoire !" : "🏳️ Abandon confirmé.");
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.showEndPopup("🏳️ Abandon confirmé. Vous avez quitté la partie.");
        }
      } catch (err) {
        console.error(err);
      }
    },

    showEndPopup(msg) {
      this.popupMessage = msg;
      this.endPopup = true;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();
      this.turnTimer = 7;
      this.updateCircle();
    },

    enterSpectatorMode() {
      this.isSpectator = true;
      this.playerStatus = "dead";
      this.selectedCell = null;
      // On garde fetchInterval actif pour voir la partie en temps réel
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
          const myTeamWon = this.isTeamMode
            ? data.winner_team === this.myTeamNumber
            : data.winner_id === this.user.id;

          const msg = data.is_draw
            ? "⚖️ Égalité parfaite !"
            : myTeamWon
              ? "🏆 Victoire !"
              : "💥 Défaite !";
          this.showEndPopup(msg);
        } else if (this.isTeamMode) {
          // Mon équipe est encore en vie — je passe en spectateur
          this.enterSpectatorMode();
        } else {
          this.showEndPopup("💥 Tous vos bateaux sont coulés !");
        }
      } catch (err) {
        console.error(err);
      }
    },

    /* ----------------- Audio ----------------- */
    initAudio() {
      this.heartbeatAudio = new Audio(heartbeatSrc);
      this.heartbeatAudio.loop = true;
      this.heartbeatAudio.volume = 0.5;
    },
    playHeartbeat() {
      this.heartbeatAudio?.play().catch(() => {});
    },
    stopHeartbeat() {
      if (this.heartbeatAudio) {
        this.heartbeatAudio.pause();
        this.heartbeatAudio.currentTime = 0;
      }
    },
    updateHeartbeatSpeed() {
      if (!this.heartbeatAudio) return;
      const ships = {};
      this.playerGrid.forEach((cell) => {
        if (cell.shipNumber > 0 && cell.status !== "hit" && cell.status !== "sunk") {
          ships[cell.shipNumber] = true;
        }
      });
      this.heartbeatAudio.playbackRate = Object.keys(ships).length === 1 ? 2.0 : 1.0;
    },

    /* ----------------- Navigation ----------------- */
    goHome() {
      this.$router.push("/");
    },
  },
};
</script>

<style scoped>
html,
body {
  max-width: 100%;
  overflow-x: hidden;
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

/* BOUTON ABANDONNER */
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
  justify-content: center;
  align-items: center; /* Centre verticalement par défaut pour le 1v1 */
  gap: 30px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  flex-wrap: wrap; /* 👈 INDISPENSABLE pour que rien ne s'écrase en 1vs1 ! */
}

.grid-section {
  width: 100%;
  max-width: 350px; /* Taille pour Ta flotte et les Ennemis */
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
  aspect-ratio: 1 / 1;
  background: rgba(10, 25, 47, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
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

.cell.pending {
  background-color: #f39c12 !important; /* Orange pour indiquer l'attente */
  cursor: not-allowed;
  opacity: 0.7;
  position: relative;
}
.cell.pending::after {
  content: "⏳";
  position: absolute;
  font-size: 10px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* TIMER / CHRONO */
.timer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  flex-shrink: 0;
  align-self: center; /* Reste au milieu verticalement naturellement */
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

@media (max-width: 850px) {
  .team-left {
    order: 1;
  }
  .timer-container {
    order: 2;
    position: static; /* On retire le sticky sur mobile */
    margin: 10px 0;
  }
  .team-right {
    order: 3;
  }

  .battle-container {
    padding-top: 80px;
  }

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

  /* RE-ORGANISATION SUR MOBILE */
  .grids-wrapper,
  .team-layout {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .grid-title {
    font-size: 0.9rem;
    margin-bottom: 8px;
  }

  .player-section {
    order: 1;
  }

  .timer-container {
    order: 2;
    margin: 5px 0;
    transform: scale(0.85);
  }

  .opponent-section {
    order: 3;
  }

  .grid-section {
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.popup-content {
  background: #0a192f;
  padding: 40px;
  border: 2px solid #00d4ff;
  border-radius: 15px;
  text-align: center;
  max-width: 400px;
  width: 90%;
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

.progress-ring {
  transform: rotate(-90deg);
  transition: stroke-dashoffset 0.3s linear;
}

.progress-ring__circle {
  stroke-dasharray: 282.7;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
}

.timer-low {
  stroke: #ff4444 !important;
  filter: drop-shadow(0 0 5px #ff4444);
}

/* Layout mode équipe */
.team-layout {
  align-items: flex-start; /* Permet aux listes gauche/droite de s'étirer vers le bas sans se déformer */
}

.team-left,
.team-right {
  display: flex;
  flex-direction: column;
  gap: 30px;
  flex: 1 1 300px; /* 👈 Permet de s'adapter ou de passer à la ligne proprement */
  align-items: center;
  width: 100%;
}

.ally-section {
  width: 100%;
  max-width: 250px; /* 👈 Plus petit pour entourer parfaitement la petite grille sans faire un gros carré vide */
  background: rgba(0, 200, 80, 0.05);
  border: 1px solid rgba(0, 200, 80, 0.2);
  border-radius: 10px;
  padding: 15px;
  box-sizing: border-box;
}

.ally-title {
  color: #4caf50 !important;
  font-size: 0.9rem !important;
}

.enemy-title {
  color: #ef5350 !important;
  transition: opacity 0.2s;
}

.enemy-title:hover {
  opacity: 0.8;
}

.active-target {
  text-shadow: 0 0 8px rgba(255, 100, 100, 0.6);
}

.target-indicator {
  font-size: 0.7rem;
  color: #ff8a80;
  margin-left: 6px;
}

.ally-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 1px;
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1 / 1;
}

.ally-cell {
  width: 100%;
  height: 100%;
  cursor: default;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ally-cell:hover {
  background: rgba(255, 255, 255, 0.04);
}

.spectator-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: rgba(239, 83, 80, 0.15);
  border-bottom: 1px solid rgba(239, 83, 80, 0.4);
  color: #ef5350;
  text-align: center;
  padding: 8px;
  font-size: 0.85rem;
  letter-spacing: 1px;
  z-index: 50;
}
</style>
