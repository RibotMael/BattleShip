<template>
  <div class="battle-page background-tactical">
    <div
      v-if="lostShipsCount > 0 && !gameOver"
      class="damage-overlay"
      :style="heartbeatStyle"
    ></div>
    <header class="tactical-header">
      <div class="header-left">
        <div class="radar-ping"></div>
        <h1>{{ i18nStore.t("game_sector") }}</h1>
      </div>

      <div class="header-right">
        <button class="btn-tactical settings" @click="goToSettings" title="Paramètres">
          <span class="btn-text">{{ i18nStore.t("game_params") }}</span>
          <span class="btn-icon">⚙️</span>
        </button>
        <button class="btn-tactical abandon" @click="abandonGame" title="Abandonner la partie">
          <span class="btn-text">{{ i18nStore.t("game_abandon") }}</span>
          <span class="btn-icon">✕</span>
        </button>
      </div>
    </header>

    <div v-if="isSpectator && !gameOver" class="spectator-overlay">
      <div class="overlay-msg">{{ i18nStore.t("game_eliminated") }}</div>
    </div>

    <main v-if="isTeamMode" class="tactical-layout team-layout">
      <section class="fleet-side team-left">
        <div class="grid-container main-player">
          <h2 class="grid-label">
            <span class="dot"></span>{{ i18nStore.t("game_my_fleet") }}
            <button class="btn-hide-grid" @click="isGridHidden = !isGridHidden">
              <span class="hide-label">{{
                isGridHidden ? i18nStore.t("game_reveal") : i18nStore.t("game_hide")
              }}</span>
            </button>
          </h2>
          <div class="grid-zone">
            <transition name="mask-fade">
              <div v-if="isGridHidden" class="grid-mask">
                <span class="grid-mask-icon">🔒</span>
                <span class="grid-mask-text">{{ i18nStore.t("game_fleet_hidden") }}</span>
              </div>
            </transition>
            <div class="grid-wrapper" :class="{ 'grid-blurred': isGridHidden }">
              <div class="grid-radar player-grid">
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
          </div>
        </div>

        <div class="allies-container" :class="{ 'grid-blurred': isGridHidden }">
          <div v-for="ally in allies" :key="'ally-' + ally.id" class="ally-mini-block">
            <h3 class="mini-label">🤝 {{ ally.pseudo }}</h3>
            <div class="mini-grid ally-grid">
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
      </section>

      <section class="system-status timer-container">
        <div class="timer-module">
          <svg class="progress-ring timer-svg" viewBox="0 0 100 100" width="100%" height="100%">
            <circle class="timer-bg" cx="50" cy="50" r="45" />
            <circle
              class="progress-ring__circle timer-bar"
              cx="50"
              cy="50"
              r="45"
              :class="{ 'timer-low': turnTimer <= 5 }"
            />
          </svg>
          <div class="timer-data">
            <span class="t-value">{{ turnTimer }}s</span>
          </div>
        </div>
      </section>

      <section class="fleet-side team-right">
        <div
          v-for="(enemy, i) in enemies"
          :key="'enemy-' + enemy.id"
          class="grid-container enemy-section"
        >
          <h2
            class="grid-label enemy clickable-title"
            :class="{ 'active-target': currentOpponentIndex === i }"
            @click="currentOpponentIndex = i"
          >
            <span class="dot"></span> ⚔️ {{ enemy.pseudo }}
            <span v-if="currentOpponentIndex === i" class="target-indicator">◀ CIBLÉ</span>
          </h2>
          <div
            class="grid-wrapper target-focus"
            :class="{ 'is-targeted': currentOpponentIndex === i }"
          >
            <div class="grid-radar opponent-grid">
              <div
                v-for="(cell, index) in enemy.grid"
                :key="'enemy-cell-' + index"
                class="cell clickable-cell"
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
      </section>
    </main>

    <main v-else class="tactical-layout br-layout grids-wrapper">
      <section class="fleet-side player-side grid-section player-section">
        <div class="grid-container main-player">
          <h2 class="grid-label">
            <span class="dot"></span>{{ i18nStore.t("game_my_fleet") }}
            <button class="btn-hide-grid" @click="isGridHidden = !isGridHidden">
              <span class="hide-label">{{ isGridHidden ? "RÉVÉLER" : "MASQUER" }}</span>
            </button>
          </h2>
          <div class="grid-zone">
            <transition name="mask-fade">
              <div v-if="isGridHidden" class="grid-mask">
                <span class="grid-mask-icon">🔒</span>
                <span class="grid-mask-text">{{ i18nStore.t("game_fleet_hidden") }}</span>
              </div>
            </transition>
            <div class="grid-wrapper" :class="{ 'grid-blurred': isGridHidden }">
              <div class="grid-radar player-grid">
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
          </div>
        </div>
      </section>

      <section class="system-status timer-container">
        <div class="timer-module">
          <svg class="progress-ring timer-svg" width="100" height="100">
            <circle class="timer-bg" cx="50" cy="50" r="45" />
            <circle
              class="progress-ring__circle timer-bar"
              cx="50"
              cy="50"
              r="45"
              :class="{ 'timer-low': turnTimer <= 5 }"
            />
          </svg>
          <div class="timer-data">
            <span class="t-value">{{ turnTimer }}s</span>
          </div>
        </div>
      </section>

      <section class="fleet-side enemy-side grid-section opponent-section">
        <div class="grid-container">
          <h2 class="grid-label enemy">
            <span class="dot"></span> CIBLE :
            <select
              v-if="opponents.length > 1"
              v-model="currentOpponentIndex"
              class="target-select opponent-dropdown"
            >
              <option v-for="(opp, i) in opponents" :key="opp.id" :value="i">
                {{ opp.pseudo }}
              </option>
            </select>
            <span v-else>ADVERSAIRE</span>
          </h2>
          <div class="grid-wrapper target-focus is-targeted">
            <div class="grid-radar opponent-grid">
              <div
                v-for="(cell, index) in currentOpponent.grid"
                :key="'opp-cell-' + index"
                class="cell clickable-cell"
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
      </section>
    </main>

    <transition name="hud-fade">
      <div v-if="endPopup" class="hud-overlay popup-overlay">
        <div class="hud-popup popup-content" :class="popupResultClass">
          <div class="glow-line"></div>

          <header class="popup-result-banner">
            <span class="popup-result-icon">{{ popupIcon }}</span>
            <h2 class="popup-result-title">{{ popupMessage }}</h2>
          </header>

          <div v-if="rewardData" class="reward-grid rewards-section">
            <div class="rewards-row">
              <div class="reward-box gold reward-card gold-card">
                <span class="reward-card-icon">🪙</span>
                <div class="reward-details">
                  <span class="value reward-card-amount">+{{ rewardData.goldGain }}</span>
                  <span class="label reward-card-label">{{ i18nStore.t("game_credits") }}</span>
                </div>
              </div>
              <div class="reward-box xp reward-card xp-card">
                <span class="reward-card-icon">⭐</span>
                <div class="reward-details">
                  <span class="value reward-card-amount">+{{ rewardData.xpGain }}</span>
                  <span class="label reward-card-label">{{ i18nStore.t("game_xp") }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="rewardData.levelUp && rewardData.levelUpGoldGain > 0"
              class="levelup-gold-note"
            >
              <span>🎁 BONUS MONTÉE DE NIVEAU :</span>
              <span class="levelup-gold-amount">+{{ rewardData.levelUpGoldGain }} 🪙</span>
            </div>

            <div v-if="rewardData.levelUp" class="levelup-banner">
              🎉 {{ i18nStore.t("game_level_reached", { n: rewardData.newLevel }) }}
            </div>

            <div class="xp-module xp-progress-block">
              <div class="xp-info xp-progress-header">
                <span>NIV. {{ rewardData.newLevel }}</span>
                <span
                  >{{ rewardData.xpIntoLevel }} / {{ rewardData.xpNeededForNext }}
                  {{ i18nStore.t("game_level_bonus") }}</span
                >
              </div>
              <div class="xp-track xp-bar-track">
                <div class="xp-fill xp-bar-fill" :style="{ width: xpProgressPercent + '%' }"></div>
              </div>
            </div>
          </div>

          <div v-else class="rewards-loading">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </div>

          <button class="btn-radar validate btn-home" @click="goHome">
            {{ i18nStore.t("game_return_hq") }}
          </button>
        </div>
      </div>
    </transition>

    <transition name="hud-fade">
      <div
        v-if="showSettings"
        class="hud-overlay settings-modal-overlay"
        @click.self="showSettings = false"
      >
        <div class="hud-popup settings-modal-content">
          <div class="glow-line"></div>

          <header class="popup-result-banner">
            <h2 class="popup-result-title" style="font-size: 1.2rem; letter-spacing: 3px">
              ⚙️ CONFIGURATION
            </h2>
          </header>

          <div class="settings-modal-body">
            <section class="settings-modal-section">
              <p class="settings-modal-label">VOLUME MUSIQUE</p>
              <div class="settings-modal-row">
                <input
                  type="range"
                  v-model="settingsStore.musicVolume"
                  min="0"
                  max="100"
                  class="settings-modal-slider"
                />
                <span class="settings-modal-value">{{ settingsStore.musicVolume }}%</span>
              </div>
            </section>

            <section class="settings-modal-section">
              <p class="settings-modal-label">EFFETS SONORES</p>
              <div class="settings-modal-row">
                <input
                  type="range"
                  v-model="settingsStore.effectsVolume"
                  min="0"
                  max="100"
                  class="settings-modal-slider"
                />
                <span class="settings-modal-value">{{ settingsStore.effectsVolume }}%</span>
              </div>
            </section>

            <section class="settings-modal-section">
              <div class="settings-modal-row settings-modal-switch-row">
                <p class="settings-modal-label" style="margin: 0">EFFET HEARTBEAT</p>
                <label class="switch">
                  <input type="checkbox" v-model="settingsStore.showHeartbeat" />
                  <span class="slider"></span>
                </label>
              </div>
            </section>

            <section class="settings-modal-section">
              <p class="settings-modal-label">QUALITÉ GRAPHIQUE</p>
              <select v-model="settingsStore.graphicsQuality" class="settings-modal-select">
                <option value="low">BASSE</option>
                <option value="medium">OPTIMISÉE</option>
                <option value="high">HAUTE</option>
              </select>
            </section>
          </div>

          <button class="btn-radar" @click="showSettings = false">FERMER</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import socket from "../services/socket.js";
import heartbeatSrc from "@/assets/audio/BattementsDeCoeur.mp3";
import { userBus } from "@/eventBus.js";
import { settingsStore } from "@/stores/settings";
import shootSrc from "@/assets/audio/shoot.mp3";
import { i18nStore } from "@/stores/i18n";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default {
  name: "GameBoard",
  props: {
    gameId: { type: String, required: true },
    // default "" pour éviter le warning quand le prop est absent au montage,
    // sans déclencher is1v1 = true qui appelle fetchOpponent() (route inexistante)
    gameType: { type: String, default: "" },
  },
  data() {
    return {
      playerGrid: Array.from({ length: 100 }, () => ({ shipNumber: 0, status: "" })),
      opponents: [],
      allies: [],
      enemies: [],
      myTeamNumber: null,
      currentOpponentIndex: 0,
      turnTimer: 7,
      gameOver: false,
      fetchInterval: null,
      turnInterval: null,
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      selectedCell: null,
      selectedEnemyIndex: 0,
      endPopup: false,
      popupMessage: "",
      popupIcon: "",
      playerStatus: "in_game",
      hasFiredThisTurn: false,
      isSelecting: false,
      heartbeatAudio: null,
      detectedTeamMode: false,
      isSpectator: false,
      rewardData: null,
      rewardClaimed: false,
      turnStartAt: null,
      localTimerInterval: null,
      isGridHidden: false,
      settingsStore,
      _firingLock: false,
      shootAudio: null,
      showSettings: false,
      i18nStore,
    };
  },
  computed: {
    isTeamMode() {
      return ["2v2", "3v3", "4v4"].includes(this.gameType) || this.detectedTeamMode;
    },
    is1v1() {
      return this.gameType === "1v1";
    },
    lostShipsCount() {
      const sunkCells = this.playerGrid.filter((cell) => cell.status === "sunk").length;
      return Math.floor(sunkCells / 3);
    },
    heartbeatStyle() {
      if (!this.settingsStore.showHeartbeat || this.lostShipsCount <= 0 || this.gameOver) {
        return { display: "none" };
      }
      const maxShips = 5;
      const ratio = Math.min(this.lostShipsCount / maxShips, 1);
      const duration = 2 - ratio * 1.5;
      const intensity = 0.2 + ratio * 0.6;
      const spread = 30 + ratio * 40;
      return {
        animationDuration: `${duration}s`,
        background: `radial-gradient(circle, transparent ${100 - spread}%, rgba(180, 0, 0, ${intensity}) 100%)`,
        display: "block",
      };
    },
    currentOpponent() {
      return (
        this.opponents[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
    currentEnemy() {
      return (
        this.enemies[this.currentOpponentIndex] || {
          id: null,
          pseudo: "Chargement...",
          grid: Array(100).fill(""),
        }
      );
    },
    popupResultClass() {
      if (!this.popupMessage) return "";
      if (this.popupMessage.includes("Victoire")) return "popup-victory";
      if (this.popupMessage.includes("Défaite")) return "popup-defeat";
      if (this.popupMessage.includes("Égalité")) return "popup-draw";
      return "popup-defeat";
    },
    xpProgressPercent() {
      if (!this.rewardData) return 0;
      const { xpIntoLevel, xpNeededForNext } = this.rewardData;
      if (!xpNeededForNext) return 0;
      return Math.min(100, Math.floor((xpIntoLevel / xpNeededForNext) * 100));
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

    socket.on("connect", () => {
      if (!this.gameOver) this.resyncTimer();
    });

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
      this.updateGridCell(targetId, index, "pending");
    });

    socket.on("cell-unlocked", (data) => {
      const { targetId, index } = data;
      const pool = this.isTeamMode ? this.enemies : this.opponents;
      const opp = pool.find((o) => String(o.id) === String(targetId));
      if (opp && opp.grid[index] === "pending") {
        this.updateGridCell(targetId, index, "");
      }
    });

    this.$watch(
      () => this.settingsStore.effectsVolume,
      (newVolume) => {
        if (this.heartbeatAudio) {
          this.heartbeatAudio.volume = newVolume / 100;
        }
        if (this.shootAudio) {
          this.shootAudio.volume = newVolume / 100;
        }
      },
    );
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

    async claimReward(isVictory) {
      if (this.rewardClaimed || this.isSpectator) return;
      this.rewardClaimed = true;
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${this.user.id}/reward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isVictory, gameId: this.gameId }),
        });
        const data = await res.json();
        if (data.success) {
          this.rewardData = data;
          const stored = JSON.parse(localStorage.getItem("user")) || {};
          stored.gold = data.newGold;
          stored.level = data.newLevel;
          stored.xp = data.newXp;
          localStorage.setItem("user", JSON.stringify(stored));
          userBus.userUpdated = !userBus.userUpdated;
        }
      } catch (_) {
        this.rewardData = {
          goldGain: isVictory ? 100 : 25,
          xpGain: isVictory ? 50 : 25,
          newLevel: this.user.niveau || 0,
          xpIntoLevel: 0,
          xpNeededForNext: 100,
          levelUp: false,
          newGold: this.user.gold ?? 0,
        };
      }
    },

    async syncAllShots() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/shots?playerId=${this.user.id}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!data || !data.success) return;

        if (data.incomingShots) {
          const updatedGrid = [...this.playerGrid];
          data.incomingShots.forEach((s) => {
            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            if (updatedGrid[idx]) {
              updatedGrid[idx].status = s.result ? String(s.result).toLowerCase() : "pending";
            }
          });
          this.playerGrid = updatedGrid;
        }

        const myShots = data.playerShots || [];
        myShots.forEach((s) => {
          if (!s.result) return;
          const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
          this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
        });

        if (this.isTeamMode && data.allShots) {
          data.allShots.forEach((s) => {
            if (s.result && s.state === "resolved") {
              const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
              this.updateGridCell(s.target_id, idx, s.result, s.positions);
            }
          });
        }
      } catch (_) {}
    },

    // ─── RÉCEPTION TIMER DEPUIS LE SERVEUR ──────────────────────────────────
    // Le serveur calcule timeLeft à partir de last_turn_timestamp BDD.
    // FIX CRITIQUE : si le timer tombe à <= 2 secondes et qu'on n'a pas encore
    // tiré, on envoie le tir MAINTENANT pour que PHP/Unity puisse le résoudre.
    socketTurnTimer({ timeLeft, turnStartAt }) {
      if (this.gameOver) return;

      this.turnStartAt = turnStartAt
        ? turnStartAt
        : Date.now() - (7 - Math.max(0, timeLeft)) * 1000;

      if (timeLeft >= 7) {
        this.hasFiredThisTurn = false;
        this._firingLock = false;
        this.clearPendingCells();

        // FIX : force l'affichage immédiat de 7 sans attendre le premier tick
        // local. Sans ça, si le tick démarre 200ms après, il affiche 6 puis
        // remonte jamais à 7 — le chrono semble bloqué au tour précédent.
        this.turnTimer = 7;
        this.$nextTick(this.updateCircle);
      }

      this._startLocalTick();

      // ── ENVOI ANTICIPÉ DU TIR ─────────────────────────────────────────────
      // À 2 secondes restantes, on envoie le tir sélectionné (ou aléatoire)
      // pour laisser à PHP/Unity le temps de l'inclure dans la résolution.
      // Condition: timer entre 1 et 2s, pas encore tiré, pas de verrou actif.
      if (
        timeLeft <= 2 &&
        timeLeft > 0 &&
        !this.hasFiredThisTurn &&
        !this._firingLock &&
        this.playerStatus === "in_game" &&
        !this.gameOver
      ) {
        this._firingLock = true;
        this.validateShot();
      }
    },

    _startLocalTick() {
      if (this.localTimerInterval) {
        clearInterval(this.localTimerInterval);
        this.localTimerInterval = null;
      }

      this.localTimerInterval = setInterval(() => {
        if (!this.turnStartAt || this.gameOver) return;

        const elapsed = (Date.now() - this.turnStartAt) / 1000;
        const computed = Math.max(0, Math.ceil(7 - elapsed));

        this.turnTimer = computed;
        this.$nextTick(this.updateCircle);

        if (computed <= 0) {
          clearInterval(this.localTimerInterval);
          this.localTimerInterval = null;
        }
      }, 200);
    },

    async resyncTimer() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/games/${this.gameId}/timer`);
        const data = await res.json();

        if (data.success && typeof data.timeLeft === "number") {
          const newTs = data.turnStartAt
            ? data.turnStartAt * 1000
            : Date.now() - (7 - data.timeLeft) * 1000;

          const isNewTurn = this.turnStartAt && Math.abs(newTs - this.turnStartAt) > 2000;
          if (isNewTurn || this.turnTimer === 0) {
            this.turnStartAt = newTs;
            this.turnTimer = data.timeLeft;
            if (data.timeLeft >= 6) {
              this.hasFiredThisTurn = false;
              this._firingLock = false;
              this.clearPendingCells();
            }
            this._startLocalTick();
            this.$nextTick(this.updateCircle);
          }
        }
      } catch (_) {}
    },

    // ─── FIN DE TOUR ─────────────────────────────────────────────────────────
    // Reçu via socket depuis le serveur Node.
    // Sert de FILET DE SÉCURITÉ pour les tirs pas encore envoyés
    // (ex: joueur qui n'avait pas encore sélectionné de cellule = tir aléatoire).
    endTurn() {
      if (this.gameOver) return;

      if (this.localTimerInterval) {
        clearInterval(this.localTimerInterval);
        this.localTimerInterval = null;
      }

      this.turnTimer = 0;
      this.updateCircle();

      if (!this.hasFiredThisTurn && !this._firingLock) {
        this._firingLock = true;
        this.validateShot();
      }
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

    handleGameStarted(data) {
      this.resetGameState();

      this.fetchInterval = setInterval(async () => {
        await this.fetchEnemyShots();
        await this.checkGameStatus();
      }, 2000);

      this.syncAllShots();

      const tl = data.timeLeft || 7;
      this.turnStartAt = data.turnStartAt ? data.turnStartAt : Date.now() - (7 - tl) * 1000;
      this.turnTimer = tl;
      this._startLocalTick();
      this.updateCircle();
    },

    resetGameState() {
      clearInterval(this.turnInterval);
      clearInterval(this.fetchInterval);
      if (this.localTimerInterval) {
        clearInterval(this.localTimerInterval);
        this.localTimerInterval = null;
      }
      this.fetchInterval = null;
      this.turnInterval = null;
      this.turnTimer = 7;
      this.turnStartAt = null;
      this.gameOver = false;
      this.selectedCell = null;
      this.endPopup = false;
      this.popupMessage = "";
      this.popupIcon = "";
      this.playerStatus = "in_game";
      this.hasFiredThisTurn = false;
      this._firingLock = false;
      this.isSelecting = false;
      this.rewardData = null;
      this.rewardClaimed = false;
    },

    async initGame() {
      this.resetGameState();
      await this.fetchPlayerBoard();
      await this.fetchOpponents();
      await this.$nextTick();
      await this.syncAllShots();
      await this.fetchEnemyShots();
      socket.emit("join-game", { gameId: this.gameId, playerId: this.user.id });
      socket.emit("player-ready", { gameId: this.gameId, playerId: this.user.id });

      if (!this.fetchInterval) {
        this.fetchInterval = setInterval(async () => {
          await this.fetchEnemyShots();
          await this.checkGameStatus();
          if (this.turnTimer === 0 && !this.gameOver) {
            await this.resyncTimer();
          }
        }, 2000);
      }
    },

    async fetchPlayerBoard() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/board?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        this.playerGrid = data.board
          .flat()
          .map((cell) => ({ shipNumber: cell > 0 ? cell : 0, status: "" }));
      } catch (_) {}
    },

    async fetchOpponent() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/opponent?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;
        this.opponents = [
          {
            id: data.opponentId,
            pseudo: data.opponentPseudo || "Adversaire",
            grid: Array(100).fill(""),
          },
        ];
        this.currentOpponentIndex = 0;
      } catch (_) {}
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

        if (this.myTeamNumber !== null) {
          this.detectedTeamMode = true;
          this.allies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) === Number(this.myTeamNumber),
          );
          this.enemies = all.filter(
            (o) => o.team_number !== null && Number(o.team_number) !== Number(this.myTeamNumber),
          );
          this.opponents = all;
          this.currentOpponentIndex = 0;
        } else {
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
      } catch (_) {}
    },

    updateGridCell(targetId, index, value, positions = []) {
      const resClean = String(value).toLowerCase();

      const patchArray = (array) => {
        const idxInArray = array.findIndex((o) => String(o.id) === String(targetId));
        if (idxInArray !== -1) {
          const newGrid = [...array[idxInArray].grid];
          newGrid[index] = resClean;
          if (positions && positions.length > 0) {
            positions.forEach((p) => {
              newGrid[p.y * 10 + p.x] = "sunk";
            });
          }
          array[idxInArray] = { ...array[idxInArray], grid: newGrid };
          return true;
        }
        return false;
      };

      const hasChanged = patchArray(this.opponents);
      if (this.isTeamMode) {
        patchArray(this.enemies);
        patchArray(this.allies);
        this.enemies = [...this.enemies];
        this.allies = [...this.allies];
      }
      if (hasChanged) this.opponents = [...this.opponents];
    },

    async checkGameStatus() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/games/${this.gameId}/status?playerId=${this.user.id}`,
        );
        const data = await res.json();
        if (!data.success) return;

        if (data.status === "finished" && !this.gameOver) {
          this.handleGameOver({
            winnerId: data.winner_id,
            winnerTeam: data.winner_team ?? null,
            isDraw: data.winner_id === null && data.winner_team === null,
          });
        }
      } catch (_) {}
    },

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
        this.updateGridCell(this.currentOpponent.id, oldIndex, "");
        socket.emit("unlock-cell", {
          gameId: this.gameId,
          targetId: this.currentOpponent.id,
          index: oldIndex,
          shooterId: this.user.id,
        });
      }

      this.selectedCell = index;
      this.updateGridCell(this.currentOpponent.id, index, "selected");
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

      if (this.selectedCell !== null) {
        const prevEnemy = this.enemies[this.currentOpponentIndex];
        if (prevEnemy) {
          this.updateGridCell(prevEnemy.id, this.selectedCell, "");
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
      this.updateGridCell(enemy.id, cellIndex, "selected");
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
        // Aucune cellule sélectionnée → tir aléatoire
        const available = [];
        target.grid.forEach((v, i) => {
          if (!["hit", "miss", "sunk"].includes(v)) available.push(i);
        });
        if (!available.length) return;
        index = available[Math.floor(Math.random() * available.length)];
      }

      // Marquer comme tiré AVANT l'await pour éviter tout double appel
      this.hasFiredThisTurn = true;
      await this.sendShoot(index, target);
    },

    onPlayerEliminated(data) {
      if (data.playerId === this.user.id) {
        if (this.playerStatus === "dead") return;
        this.playerStatus = "dead";
        if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          const msg =
            data.reason === "abandon"
              ? "🏳️ Éliminé par abandon"
              : "💥 Tous vos navires ont coulé !";
          this.claimReward(false);
          this.showEndPopup(msg, false);
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

    playShootSound() {
      if (!this.shootAudio) {
        this.shootAudio = new Audio(shootSrc);
      }

      this.shootAudio.currentTime = 0; // permet de rejouer rapidement
      this.shootAudio.volume = this.settingsStore.effectsVolume / 100;
      this.shootAudio.play().catch(() => {});
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
          const finalResult = data.result ? data.result : "pending";
          this.applyShot(target.id, x, y, finalResult, data.positions);
        }
        this.selectedCell = null;
      } catch (_) {}
    },

    applyShot(targetId, x, y, result, positions) {
      const idx = y * 10 + x;
      const resClean = String(result).toLowerCase();

      if (String(targetId) === String(this.user.id)) {
        const newGrid = [...this.playerGrid];
        newGrid[idx] = { ...newGrid[idx], status: resClean };
        positions?.forEach((p) => {
          const pIdx = p.y * 10 + p.x;
          if (newGrid[pIdx]) newGrid[pIdx] = { ...newGrid[pIdx], status: "sunk" };
        });
        this.playerGrid = newGrid;
        return;
      }

      this.updateGridCell(targetId, idx, resClean, positions);
    },

    onShotFired(data) {
      this.playShootSound();
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
        this.updateGridCell(targetId, idx, safeResult, positions);
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
              if (current !== "hit" && current !== "miss" && current !== "sunk") {
                updatedGrid[idx] = { ...updatedGrid[idx], status: "pending" };
                changed = true;
              }
              return;
            }

            if (current !== incoming) {
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

        const myShots = data.playerShots || [];
        myShots.forEach((s) => {
          if (!s.result) return;
          const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
          if (!this.opponents.find((o) => String(o.id) === String(s.target_id))) {
            this.fetchOpponents();
          }
          this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
        });

        if (data.allShots) {
          data.allShots.forEach((s) => {
            if (String(s.id_player) === String(this.user.id)) return;
            if (String(s.target_id) === String(this.user.id)) return;

            const idx = parseInt(s.target_y) * 10 + parseInt(s.target_x);
            const pool = this.isTeamMode ? this.enemies : this.opponents;
            const target = pool.find((o) => String(o.id) === String(s.target_id));
            if (!target) return;

            const currentVal = target.grid[idx];
            if (s.state === "pending" && s.result === null) {
              if (!["hit", "miss", "sunk"].includes(currentVal)) {
                this.updateGridCell(s.target_id, idx, "pending");
              }
            } else if (s.result) {
              if (!["hit", "miss", "sunk"].includes(currentVal)) {
                this.updateGridCell(s.target_id, idx, String(s.result).toLowerCase(), s.positions);
              }
            }
          });
        }

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
              newGrid[idx] = result;
              if (result === "sunk" && s.positions) {
                s.positions.forEach((p) => {
                  newGrid[p.y * 10 + p.x] = "sunk";
                });
              }
            });
            ally.grid = newGrid;
          });
        }
      } catch (_) {}

      this.opponents = [...this.opponents];
      if (this.isTeamMode) {
        this.enemies = [...this.enemies];
        this.allies = [...this.allies];
      }
    },

    handleGameOver(payload) {
      if (this.gameOver) return;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();

      let isVictory = false;
      let msg, icon;

      if (payload.isDraw) {
        msg = "Égalité parfaite";
        icon = "⚖️";
        isVictory = false;
      } else if (this.isTeamMode && payload.winnerTeam != null) {
        isVictory = Number(payload.winnerTeam) === Number(this.myTeamNumber);
        msg = isVictory ? "Victoire" : "Défaite";
        icon = isVictory ? "🏆" : "💥";
      } else {
        isVictory = String(payload.winnerId) === String(this.user.id);
        msg = isVictory ? "Victoire" : "Défaite";
        icon = isVictory ? "🏆" : "💥";
      }

      this.claimReward(isVictory);
      this.showEndPopup(`${icon} ${msg} !`, isVictory);
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
        if (!data.success) return;

        this.playerStatus = "dead";
        const myTeamWon = this.isTeamMode ? data.winner_team === this.myTeamNumber : false;

        if (data.finished) {
          this.claimReward(myTeamWon);
          this.showEndPopup(myTeamWon ? "🏆 Victoire !" : "🏳️ Abandon confirmé.", myTeamWon);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.showEndPopup("🏳️ Abandon confirmé.", false);
        }
      } catch (_) {}
    },

    showEndPopup(msg, isVictory = false) {
      this.popupMessage = msg;
      if (!this.popupIcon) {
        if (msg.includes("Victoire")) this.popupIcon = "🏆";
        else if (msg.includes("Égalité")) this.popupIcon = "⚖️";
        else if (msg.includes("abandon") || msg.includes("Abandon")) this.popupIcon = "🏳️";
        else this.popupIcon = "💥";
      }
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
        if (!data.success) return;

        if (data.finished) {
          const myTeamWon = this.isTeamMode
            ? data.winner_team === this.myTeamNumber
            : data.winner_id === this.user.id;

          let msg, isVic;
          if (data.is_draw) {
            msg = "⚖️ Égalité parfaite !";
            isVic = false;
          } else if (myTeamWon) {
            msg = "🏆 Victoire !";
            isVic = true;
          } else {
            msg = "💥 Défaite !";
            isVic = false;
          }
          this.claimReward(isVic);
          this.showEndPopup(msg, isVic);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.showEndPopup("💥 Tous vos bateaux sont coulés !", false);
        }
      } catch (_) {}
    },

    initAudio() {
      this.heartbeatAudio = new Audio(heartbeatSrc);
      this.heartbeatAudio.loop = true;
      this.heartbeatAudio.volume = this.settingsStore.effectsVolume / 100;
      this.shootAudio = new Audio(shootSrc);
      this.shootAudio.volume = this.settingsStore.effectsVolume / 100;
    },
    playHeartbeat() {
      this.heartbeatAudio?.play().catch(() => {});
    },
    startHeartbeat() {
      if (this.heartbeatAudio) return;
      this.heartbeatAudio = new Audio(heartbeatSrc);
      this.heartbeatAudio.loop = true;
      this.heartbeatAudio.volume = this.settingsStore.effectsVolume / 100;
      this.heartbeatAudio.play().catch(() => {});
    },
    stopHeartbeat() {
      if (this.heartbeatAudio) {
        this.heartbeatAudio.pause();
        this.heartbeatAudio = null;
      }
    },
    updateHeartbeatSpeed() {
      if (!this.settingsStore.showHeartbeat) {
        this.stopHeartbeat();
        return;
      }
      if (this.lostShipsCount > 0 && !this.gameOver) {
        this.startHeartbeat();
        if (this.heartbeatAudio) {
          const ratio = Math.min(this.lostShipsCount / 5, 1);
          this.heartbeatAudio.playbackRate = 1 + ratio * 0.8;
        }
      } else {
        this.stopHeartbeat();
      }
    },

    goToSettings() {
      this.showSettings = true;
    },

    goHome() {
      this.$router.push("/");
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap");

html,
body {
  max-width: 100%;
  overflow-x: hidden;
  position: relative;
}
.damage-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  animation: heartbeat infinite ease-in-out;
  box-shadow: inset 0 0 100px rgba(150, 0, 0, 0.2);
}

@keyframes heartbeat {
  0% {
    opacity: 0.2;
    transform: scale(1);
  }
  20% {
    opacity: 1;
    transform: scale(1.02);
  }
  40% {
    opacity: 0.4;
    transform: scale(1);
  }
  60% {
    opacity: 0.8;
    transform: scale(1.01);
  }
  100% {
    opacity: 0.2;
    transform: scale(1);
  }
}

.battle-page {
  width: 100%;
  min-height: 100vh;
  background: radial-gradient(circle at center, #061621 0%, #02080d 100%);
  display: flex;
  flex-direction: column;
  padding: 20px;
  color: #dff2ee;
  font-family: "Rajdhani", sans-serif;
  box-sizing: border-box;
  position: relative;
}

.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(29, 233, 192, 0.2);
  padding-bottom: 15px;
  margin-bottom: 30px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.radar-ping {
  width: 12px;
  height: 12px;
  background: #1de9c0;
  border-radius: 50%;
  box-shadow: 0 0 15px #1de9c0;
  animation: ping 1.5s infinite ease-out;
}

@keyframes ping {
  0% {
    transform: scale(0.8);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(29, 233, 192, 0.7);
  }
  100% {
    transform: scale(2);
    opacity: 0;
    box-shadow: 0 0 0 10px rgba(29, 233, 192, 0);
  }
}

.tactical-header h1 {
  font-size: 1.4rem;
  letter-spacing: 4px;
  margin: 0;
  color: #1de9c0;
  font-weight: 700;
}

.btn-tactical {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #f87171;
  padding: 10px 20px;
  border-radius: 4px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tactical:hover {
  background: #f87171;
  color: #02080d;
  box-shadow: 0 0 15px rgba(248, 113, 113, 0.6);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-tactical.settings {
  background: rgba(29, 233, 192, 0.08);
  border: 1px solid rgba(29, 233, 192, 0.4);
  color: #1de9c0;
}

.btn-tactical.settings:hover {
  background: #1de9c0;
  color: #02080d;
  box-shadow: 0 0 15px rgba(29, 233, 192, 0.5);
}

.btn-icon {
  display: none;
}

.spectator-overlay {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #f87171;
  padding: 8px 20px;
  font-size: 1rem;
  letter-spacing: 2px;
  font-weight: 600;
  border-radius: 4px;
  z-index: 50;
  backdrop-filter: blur(4px);
}

.tactical-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: 40px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.fleet-side,
.grid-container,
.grid-wrapper {
  min-width: 0;
}

.fleet-side {
  display: flex;
  flex-direction: column;
  gap: 30px;
  width: 100%;
}

.team-left,
.player-side {
  align-items: flex-end;
}
.team-right,
.enemy-side {
  align-items: flex-start;
}

.grid-container {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.grid-label {
  font-size: 1.1rem;
  letter-spacing: 2px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1de9c0;
  font-weight: 600;
}

.grid-label.enemy {
  color: #f87171;
}
.grid-label .dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
}

.clickable-title {
  cursor: pointer;
  transition: opacity 0.2s;
}
.clickable-title:hover {
  opacity: 0.8;
}
.active-target {
  text-shadow: 0 0 10px rgba(248, 113, 113, 0.6);
}
.target-indicator {
  font-size: 0.8rem;
  color: #fca5a5;
  margin-left: 8px;
  animation: pulse 1s infinite alternate;
}

.target-select {
  background: rgba(6, 22, 33, 0.8);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.5);
  padding: 4px 8px;
  font-family: "Rajdhani";
  font-size: 1rem;
  border-radius: 4px;
  margin-left: 10px;
  outline: none;
}

.grid-wrapper {
  background: rgba(29, 233, 192, 0.03);
  padding: 8px;
  border: 1px solid rgba(29, 233, 192, 0.15);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.grid-wrapper.target-focus {
  background: rgba(248, 113, 113, 0.03);
  border-color: rgba(248, 113, 113, 0.15);
}
.grid-wrapper.is-targeted {
  border-color: rgba(248, 113, 113, 0.5);
  box-shadow: 0 0 15px rgba(248, 113, 113, 0.15);
}

.grid-radar {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 2px;
  background: rgba(29, 233, 192, 0.1);
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 100%;
  min-width: 0;
}

.target-focus .grid-radar {
  background: rgba(248, 113, 113, 0.1);
}

.cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  background: #030a10;
  border: 1px solid rgba(29, 233, 192, 0.05);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
  min-width: 0;
  min-height: 0;
}

.target-focus .cell {
  border-color: rgba(248, 113, 113, 0.05);
}

.clickable-cell:hover:not(.hit):not(.miss):not(.sunk) {
  background: rgba(248, 113, 113, 0.2);
  cursor: crosshair;
}

.player-grid .cell.ship {
  background: rgba(29, 233, 192, 0.2);
  border: 1px solid rgba(29, 233, 192, 0.5);
  box-shadow: inset 0 0 10px rgba(29, 233, 192, 0.2);
}

.cell.hit {
  background: #f87171 !important;
  box-shadow: inset 0 0 15px #000;
  border-color: #f87171;
  z-index: 1;
}

.cell.miss {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell.miss::after {
  content: "";
  width: 6px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.cell.sunk {
  background: #1a202c !important;
  border: 1px solid #2d3748;
}
.cell.sunk::after {
  content: "✕";
  color: #f87171;
  font-size: 1.2rem;
  font-weight: bold;
  opacity: 0.8;
}

.cell.selected {
  outline: 2px solid #fbbf24;
  background: rgba(251, 191, 36, 0.2) !important;
  z-index: 2;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}

.cell.pending {
  background-color: rgba(245, 158, 11, 0.6) !important;
  cursor: not-allowed;
  position: relative;
}
.cell.pending::after {
  content: "⏳";
  font-size: 12px;
}

.system-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  padding-top: 40px;
}

.timer-module {
  position: relative;
  width: 100px;
  height: 100px;
}

.timer-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.timer-bg {
  fill: none;
  stroke: rgba(29, 233, 192, 0.1);
  stroke-width: 4;
}

.timer-bar {
  fill: none;
  stroke: #1de9c0;
  stroke-width: 4;
  stroke-dasharray: 282.7;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
  filter: drop-shadow(0 0 6px rgba(29, 233, 192, 0.5));
}

.timer-bar.timer-low {
  stroke: #f87171 !important;
  filter: drop-shadow(0 0 8px #f87171);
}

.timer-data {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.t-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.allies-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 15px;
  width: 100%;
  max-width: 380px;
}

.ally-mini-block {
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 4px;
  padding: 10px;
}

.mini-label {
  color: #1de9c0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: rgba(29, 233, 192, 0.1);
}

.ally-cell {
  background: #030a10;
  border: none;
  cursor: default;
}

.hud-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 8, 13, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.hud-popup {
  width: 90%;
  max-width: 450px;
  background: #061621;
  border: 1px solid rgba(29, 233, 192, 0.3);
  padding: 40px 30px;
  position: relative;
  border-radius: 4px;
  box-shadow:
    0 0 50px rgba(0, 0, 0, 0.8),
    inset 0 0 20px rgba(29, 233, 192, 0.05);
  text-align: center;
}

.glow-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: #1de9c0;
  box-shadow: 0 0 15px #1de9c0;
}

.popup-victory {
  border-color: rgba(251, 191, 36, 0.5);
}
.popup-victory .glow-line {
  background: #fbbf24;
  box-shadow: 0 0 15px #fbbf24;
}
.popup-victory .popup-result-title {
  color: #fbbf24;
  text-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}

.popup-defeat {
  border-color: rgba(248, 113, 113, 0.5);
}
.popup-defeat .glow-line {
  background: #f87171;
  box-shadow: 0 0 15px #f87171;
}
.popup-defeat .popup-result-title {
  color: #f87171;
  text-shadow: 0 0 15px rgba(248, 113, 113, 0.4);
}

.popup-result-banner {
  margin-bottom: 25px;
}
.popup-result-icon {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 10px;
}
.popup-result-title {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 0;
}

.reward-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}
.rewards-row {
  display: flex;
  gap: 15px;
}

.reward-box {
  flex: 1;
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-left: 4px solid #1de9c0;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.reward-box.gold {
  border-left-color: #fbbf24;
}
.reward-box.xp {
  border-left-color: #60a5fa;
}
.reward-card-icon {
  font-size: 2rem;
}
.reward-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.reward-details .value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}
.reward-box.gold .value {
  color: #fbbf24;
}
.reward-box.xp .value {
  color: #60a5fa;
}
.reward-details .label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}

.levelup-gold-note {
  display: flex;
  justify-content: space-between;
  background: rgba(251, 191, 36, 0.1);
  border: 1px dashed rgba(251, 191, 36, 0.4);
  padding: 10px 15px;
  font-size: 0.85rem;
  color: rgba(251, 191, 36, 0.8);
  letter-spacing: 1px;
}
.levelup-gold-amount {
  font-weight: 700;
  color: #fbbf24;
}

.levelup-banner {
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid #fbbf24;
  padding: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #fbbf24;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
  animation: pulse 1.5s infinite alternate;
}

@keyframes pulse {
  from {
    box-shadow: 0 0 5px rgba(251, 191, 36, 0.1);
  }
  to {
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
  }
}

.xp-module {
  margin-top: 5px;
}
.xp-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}
.xp-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}
.xp-fill {
  height: 100%;
  background: #1de9c0;
  box-shadow: 0 0 10px #1de9c0;
  transition: width 1s ease 0.5s;
}

.btn-radar {
  width: 100%;
  padding: 15px;
  background: rgba(29, 233, 192, 0.15);
  border: 1px solid #1de9c0;
  color: #1de9c0;
  font-family: "Rajdhani";
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-radar:hover {
  background: #1de9c0;
  color: #02080d;
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.4);
}

.rewards-loading {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 30px 0;
}
.loading-dot {
  width: 8px;
  height: 8px;
  background: #1de9c0;
  border-radius: 50%;
  animation: dotBounce 1s infinite;
}
.loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotBounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-10px);
    opacity: 1;
    box-shadow: 0 0 10px #1de9c0;
  }
}

@media (max-width: 850px) {
  .tactical-header h1 {
    font-size: 1rem;
  }
  .btn-tactical {
    padding: 8px;
    min-width: 40px;
    justify-content: center;
  }
  .btn-text {
    display: none;
  }
  .btn-icon {
    display: block;
    font-size: 1.2rem;
    margin: 0;
  }

  .tactical-layout {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 20px;
    justify-content: center;
    align-items: start;
  }

  .team-left,
  .team-right,
  .player-side,
  .enemy-side {
    align-items: center;
  }
  .team-left,
  .team-right {
    display: flex;
    justify-content: center;
  }

  .timer-container {
    order: -1;
    padding-top: 0;
    margin: 10px 0;
    transform: scale(0.9);
  }
  .grid-container {
    max-width: 100%;
  }
  .hud-popup {
    padding: 30px 20px;
  }
  .rewards-row {
    flex-direction: column;
  }
}

.btn-hide-grid {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(29, 233, 192, 0.08);
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
  padding: 3px 10px;
  border-radius: 3px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition:
    background 0.2s,
    box-shadow 0.2s;
  white-space: nowrap;
}

.btn-hide-grid:hover {
  background: rgba(29, 233, 192, 0.18);
  box-shadow: 0 0 8px rgba(29, 233, 192, 0.2);
}

.grid-zone {
  position: relative;
}

.grid-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(3, 10, 16, 0.92);
  border: 1px solid rgba(29, 233, 192, 0.15);
  border-radius: 4px;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.grid-mask-icon {
  font-size: 1.8rem;
  opacity: 0.6;
}
.grid-mask-text {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 3px;
  color: rgba(29, 233, 192, 0.4);
}

.grid-blurred {
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
}

.mask-fade-enter-active,
.mask-fade-leave-active {
  transition: opacity 0.25s ease;
}
.mask-fade-enter-from,
.mask-fade-leave-to {
  opacity: 0;
}

@media (max-width: 850px) {
  .hide-label {
    display: none;
  }
  .btn-hide-grid {
    padding: 3px 7px;
  }
}

.settings-modal-overlay {
  z-index: 9999;
}

.settings-modal-content {
  max-width: 400px;
  padding: 30px 25px;
}

.settings-modal-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 25px;
  text-align: left;
}

.settings-modal-section {
  background: rgba(29, 233, 192, 0.04);
  border: 1px solid rgba(29, 233, 192, 0.12);
  border-radius: 4px;
  padding: 12px 15px;
}

.settings-modal-label {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: #1de9c0;
  font-weight: 700;
  margin: 0 0 10px;
}

.settings-modal-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-modal-switch-row {
  justify-content: space-between;
}

.settings-modal-slider {
  -webkit-appearance: none;
  flex: 1;
  height: 4px;
  background: rgba(29, 233, 192, 0.2);
  outline: none;
  border-radius: 2px;
}

.settings-modal-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 18px;
  background: #1de9c0;
  cursor: pointer;
  border-radius: 1px;
  box-shadow: 0 0 5px rgba(29, 233, 192, 0.5);
}

.settings-modal-value {
  font-family: monospace;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
  padding: 3px 8px;
  min-width: 46px;
  text-align: center;
  font-size: 0.85rem;
}

.settings-modal-select {
  width: 100%;
  background: rgba(3, 10, 16, 0.9);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.4);
  padding: 8px 12px;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  letter-spacing: 1px;
  outline: none;
  border-radius: 2px;
}
</style>
