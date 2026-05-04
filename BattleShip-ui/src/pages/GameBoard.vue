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
          <span class="btn-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
          </span>
        </button>
        <button class="btn-tactical abandon" @click="abandonGame" title="Abandonner la partie">
          <span class="btn-text">{{ i18nStore.t("game_abandon") }}</span>
          <span class="btn-icon">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
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
                <span class="grid-mask-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
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
            <h3 class="mini-label">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {{ ally.pseudo }}
            </h3>
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
              ref="timerCircle"
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
            <span class="dot"></span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="flex-shrink: 0"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
            {{ enemy.pseudo }}
            <span v-if="currentOpponentIndex === i" class="target-indicator">◀ CIBLE</span>
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
            <!-- FIX bug #6 : utilisation de i18n au lieu de texte hardcodé -->
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
      </section>

      <section class="system-status timer-container">
        <div class="timer-module">
          <svg class="progress-ring timer-svg" width="100" height="100">
            <circle class="timer-bg" cx="50" cy="50" r="45" />
            <circle
              ref="timerCircle"
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
            <span class="popup-result-icon">
              <svg
                v-if="popupIcon === 'trophy'"
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
              </svg>
              <svg
                v-else-if="popupIcon === 'defeat'"
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M12 2a9 9 0 0 1 9 9c0 3.18-1.65 5.97-4.14 7.6L17 22H7l.14-3.4A9 9 0 0 1 3 11a9 9 0 0 1 9-9z"
                />
                <line x1="9" y1="12" x2="9.01" y2="12" stroke-width="3" />
                <line x1="15" y1="12" x2="15.01" y2="12" stroke-width="3" />
                <path d="M10 17h4" />
              </svg>
              <svg
                v-else-if="popupIcon === 'draw'"
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="3" x2="12" y2="21" />
                <path d="M3 6l9-3 9 3" />
                <path d="M3 18l3-9 3 9a3 3 0 0 1-6 0z" />
                <path d="M15 18l3-9 3 9a3 3 0 0 1-6 0z" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
              <svg
                v-else-if="popupIcon === 'abandon'"
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </span>
            <h2 class="popup-result-title">{{ popupMessage }}</h2>
          </header>

          <div v-if="rewardData" class="reward-grid rewards-section">
            <div class="rewards-row">
              <div class="reward-box gold reward-card gold-card">
                <span class="reward-card-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.5 9a2.5 2.5 0 0 0-5 0c0 5 5 3 5 6a2.5 2.5 0 0 1-5 0" />
                    <path d="M12 6v2m0 8v2" />
                  </svg>
                </span>
                <div class="reward-details">
                  <span class="value reward-card-amount">+{{ rewardData.goldGain }}</span>
                  <span class="label reward-card-label">{{ i18nStore.t("game_credits") }}</span>
                </div>
              </div>
              <div class="reward-box xp reward-card xp-card">
                <span class="reward-card-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    />
                  </svg>
                </span>
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
              <span style="display: flex; align-items: center; gap: 6px">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
                BONUS MONTÉE DE NIVEAU :
              </span>
              <span class="levelup-gold-amount">+{{ rewardData.levelUpGoldGain }} 🪙</span>
            </div>

            <div v-if="rewardData.levelUp" class="levelup-banner">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="display: inline; vertical-align: middle; margin-right: 6px"
              >
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              {{ i18nStore.t("game_level_reached", { n: rewardData.newLevel }) }}
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="display: inline; vertical-align: middle; margin-right: 8px"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
              </svg>
              CONFIGURATION
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
import destructionSrc from "@/assets/audio/Destruction.mp3";
import { i18nStore } from "@/stores/i18n";
import { useShopStore } from "@/stores/shopStore.js";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default {
  name: "GameBoard",
  setup() {
    const shopStore = useShopStore();
    return { shopStore };
  },
  props: {
    gameId: { type: String, required: true },
    gameType: { type: String, default: "" },
  },
  data() {
    return {
      // --- Utilisateur et Configuration ---
      user: JSON.parse(localStorage.getItem("user")) || { id: null, pseudo: "" },
      settingsStore,
      i18nStore,
      showSettings: false,

      // --- Grille et Joueurs ---
      playerGrid: Array.from({ length: 100 }, () => ({ shipNumber: 0, status: "" })),
      opponents: [],
      allies: [],
      enemies: [],
      myTeamNumber: null,
      isSpectator: false,
      isGridHidden: false,
      detectedTeamMode: false,
      playerStatus: "in_game",

      // --- Logique de Tour et Timers ---
      currentOpponentIndex: 0,
      selectedEnemyIndex: 0,
      turnTimer: 7,
      turnStartAt: null,
      turnInterval: null,
      localTimerInterval: null,
      fetchInterval: null,

      // --- Actions de Jeu ---
      selectedCell: null,
      isSelecting: false,
      hasFiredThisTurn: false,
      _firingLock: false,

      // --- Fin de partie et Récompenses ---
      gameOver: false,
      endPopup: false,
      popupMessage: "",
      popupIcon: "",
      rewardData: null,
      rewardClaimed: false,

      // --- Audio ---
      heartbeatAudio: null,
      shootAudio: null,
      destructionAudio: null,
    };
  },
  computed: {
    isTeamMode() {
      return ["2v2", "3v3", "4v4"].includes(this.gameType) || this.detectedTeamMode;
    },
    is1v1() {
      return this.gameType === "1v1";
    },
    // FIX bug #7 : compter les navires uniques coulés via shipNumber distinct
    // (correct pour mode français ET belge quelle que soit la taille des navires)
    lostShipsCount() {
      const sunkShipNumbers = new Set(
        this.playerGrid
          .filter((cell) => cell.status === "sunk" && cell.shipNumber > 0)
          .map((cell) => cell.shipNumber),
      );
      return sunkShipNumbers.size;
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
    // FIX bug #8 : utiliser popupIcon (valeur structurée) plutôt que le texte du message
    popupResultClass() {
      const map = {
        trophy: "popup-victory",
        defeat: "popup-defeat",
        draw: "popup-draw",
        abandon: "popup-defeat",
      };
      return map[this.popupIcon] || "";
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
    // FIX bug #2 : guard côté client — ignorer game-over si déjà traité
    socket.on("game-over", (data) => {
      if (!this.gameOver) this.handleGameOver(data);
    });
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
        if (this.heartbeatAudio) this.heartbeatAudio.volume = newVolume / 100;
        if (this.shootAudio) this.shootAudio.volume = newVolume / 100;
        if (this.destructionAudio) this.destructionAudio.volume = newVolume / 100;
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

    socketTurnTimer({ timeLeft, turnStartAt }) {
      if (this.gameOver) return;

      this.turnStartAt = turnStartAt
        ? turnStartAt
        : Date.now() - (7 - Math.max(0, timeLeft)) * 1000;

      if (timeLeft >= 7) {
        this.hasFiredThisTurn = false;
        this._firingLock = false;
        this.clearPendingCells();
        this.turnTimer = 7;
        this.$nextTick(this.updateCircle);
      }

      this._startLocalTick();
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

    // FIX bug #4 : utiliser this.$refs.timerCircle au lieu de querySelector
    updateCircle() {
      const circle = this.$refs.timerCircle;
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
      const userId = this.user?.id || this.user?.ID_Users;
      if (userId && this.shopStore.items.length === 0) {
        await this.shopStore.fetchShop(userId);
      }
      this.shopStore.applyThemeToDOM();

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

        // FIX bug #2 : guard — ne pas rappeler handleGameOver si déjà traité
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
        if (this.playerStatus === "dead") return;
        this.playerStatus = "dead";
        if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.popupIcon = data.reason === "abandon" ? "abandon" : "defeat";
          const msg =
            data.reason === "abandon" ? "Éliminé par abandon" : "Tous vos navires ont coulé !";
          this.claimReward(false);
          this.showEndPopup(msg, false);
        }
        return;
      }

      if (this.isTeamMode) {
        const wasCurrentEnemy = this.enemies[this.currentOpponentIndex]?.id === data.playerId;
        this.enemies = this.enemies.filter((o) => String(o.id) !== String(data.playerId));
        this.allies = this.allies.filter((o) => String(o.id) !== String(data.playerId));
        if (wasCurrentEnemy && this.currentOpponentIndex >= this.enemies.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      } else {
        const isCurrentTarget =
          String(this.opponents[this.currentOpponentIndex]?.id) === String(data.playerId);
        this.opponents = this.opponents.filter((opp) => String(opp.id) !== String(data.playerId));
        if (isCurrentTarget || this.currentOpponentIndex >= this.opponents.length) {
          this.currentOpponentIndex = 0;
          this.selectedCell = null;
        }
      }
    },

    playShootSound() {
      if (!this.shootAudio) {
        this.shootAudio = new Audio(shootSrc);
      }

      this.shootAudio.currentTime = 0;
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
      if (resClean === "sunk" && positions && positions.length > 0) {
        this.playDestructionSound();
      }
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
      if (safeResult === "sunk" && positions && positions.length > 0) {
        this.playDestructionSound();
      }
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

    // FIX bugs #1 et #3 :
    // - Suppression du double appel claimReward/showEndPopup
    // - Suppression de la variable icon non initialisée
    handleGameOver(payload) {
      if (this.gameOver) return;
      this.gameOver = true;
      clearInterval(this.fetchInterval);
      clearInterval(this.turnInterval);
      this.removeSocketListeners();

      let isVictory = false;
      let msg;

      if (payload.isDraw) {
        msg = "Égalité parfaite";
        this.popupIcon = "draw";
        isVictory = false;
      } else if (this.isTeamMode && payload.winnerTeam != null) {
        isVictory = Number(payload.winnerTeam) === Number(this.myTeamNumber);
        msg = isVictory ? "Victoire" : "Défaite";
        this.popupIcon = isVictory ? "trophy" : "defeat";
      } else {
        isVictory = String(payload.winnerId) === String(this.user.id);
        msg = isVictory ? "Victoire" : "Défaite";
        this.popupIcon = isVictory ? "trophy" : "defeat";
      }

      // Un seul appel à chaque méthode
      this.claimReward(isVictory);
      this.showEndPopup(`${msg} !`, isVictory);
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
          this.popupIcon = myTeamWon ? "trophy" : "abandon";
          this.showEndPopup(myTeamWon ? "Victoire !" : "Abandon confirmé.", myTeamWon);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.popupIcon = "abandon";
          this.showEndPopup("Abandon confirmé.", false);
        }
      } catch (_) {}
    },

    showEndPopup(msg, isVictory = false) {
      this.popupMessage = msg;
      if (!this.popupIcon) {
        if (msg.includes("Victoire")) this.popupIcon = "trophy";
        else if (msg.includes("Égalité")) this.popupIcon = "draw";
        else if (msg.toLowerCase().includes("abandon")) this.popupIcon = "abandon";
        else this.popupIcon = "defeat";
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
            msg = "Égalité parfaite !";
            isVic = false;
            this.popupIcon = "draw";
          } else if (myTeamWon) {
            msg = "Victoire !";
            isVic = true;
            this.popupIcon = "trophy";
          } else {
            msg = "Défaite !";
            isVic = false;
            this.popupIcon = "defeat";
          }
          this.claimReward(isVic);
          this.showEndPopup(msg, isVic);
        } else if (this.isTeamMode) {
          this.enterSpectatorMode();
        } else {
          this.claimReward(false);
          this.popupIcon = "defeat";
          this.showEndPopup("Tous vos bateaux sont coulés !", false);
        }
      } catch (_) {}
    },

    initAudio() {
      this.heartbeatAudio = new Audio(heartbeatSrc);
      this.heartbeatAudio.loop = true;
      this.heartbeatAudio.volume = this.settingsStore.effectsVolume / 100;
      this.shootAudio = new Audio(shootSrc);
      this.shootAudio.volume = this.settingsStore.effectsVolume / 100;
      this.destructionAudio = new Audio(destructionSrc);
      this.destructionAudio.volume = this.settingsStore.effectsVolume / 100;
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

    playDestructionSound() {
      if (!this.destructionAudio) {
        this.destructionAudio = new Audio(destructionSrc);
      }
      this.destructionAudio.currentTime = 0;
      this.destructionAudio.volume = this.settingsStore.effectsVolume / 100;
      this.destructionAudio.play().catch(() => {});
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
/* ── 1. IMPORT & CONFIGURATION GLOBALE ── */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap");

html,
body {
  position: relative;
  max-width: 100%;
  overflow-x: hidden;
}

/* ── 2. LAYOUT PRINCIPAL ── */
.battle-page {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  padding: 20px;
  background: radial-gradient(
    ellipse at 30% 20%,
    var(--ocean-mid, #0d2137) 0%,
    var(--ocean-deep, #061621) 45%,
    #000 100%
  );
  color: #dff2ee;
  font-family: "Rajdhani", sans-serif;
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

/* ── 3. HEADER & NAVIGATION ── */
.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.2);
}

.tactical-header h1 {
  margin: 0;
  color: var(--accent, #1de9c0);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 4px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-tactical {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 4px;
  color: #f87171;
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-tactical:hover {
  background: #f87171;
  color: #02080d;
  box-shadow: 0 0 15px rgba(248, 113, 113, 0.6);
}

.btn-tactical.settings {
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.08);
  border-color: rgba(var(--accent-rgb, 29, 233, 192), 0.4);
  color: var(--accent, #1de9c0);
}

.btn-tactical.settings:hover {
  background: var(--accent, #1de9c0);
  color: #02080d;
  box-shadow: 0 0 15px rgba(var(--accent-rgb, 29, 233, 192), 0.5);
}

.spectator-overlay {
  position: absolute;
  top: 80px;
  left: 50%;
  z-index: 50;
  padding: 8px 20px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 4px;
  color: #f87171;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 2px;
  backdrop-filter: blur(4px);
  transform: translateX(-50%);
}

/* ── 4. GRILLES (RADAR & JOUEUR) ── */
.grid-container {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.grid-wrapper {
  padding: 8px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.03);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.18);
  border-radius: 4px;
  box-shadow:
    0 0 20px rgba(0, 0, 0, 0.5),
    0 0 30px rgba(var(--accent-rgb, 29, 233, 192), 0.04);
}

.grid-wrapper.target-focus {
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.04);
  border-color: rgba(var(--accent-rgb, 29, 233, 192), 0.25);
}

.grid-wrapper.is-targeted {
  border-color: rgba(var(--accent-rgb, 29, 233, 192), 0.55);
  box-shadow:
    0 0 15px rgba(var(--accent-rgb, 29, 233, 192), 0.18),
    0 0 40px rgba(var(--accent-rgb, 29, 233, 192), 0.06);
}

.grid-radar {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(10, 1fr);
  gap: 2px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  aspect-ratio: 1 / 1;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.08);
}

.target-focus .grid-radar {
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.05);
}

/* ── 5. CELLULES & ÉTATS DE JEU ── */
.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1 / 1;
  background: rgba(var(--ocean-deep, 6, 22, 33), 0.9);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.07);
  transition: all 0.1s;
}

.target-focus .cell {
  border-color: rgba(248, 113, 113, 0.05);
}

.clickable-cell:hover:not(.hit):not(.miss):not(.sunk) {
  background: rgba(var(--brass-rgb, 200, 147, 62), 0.25);
  cursor: crosshair;
}

/* Navires Joueur */
.player-grid .cell.ship {
  background: rgba(var(--brass-rgb, 200, 147, 62), 0.28);
  border: 1px solid rgba(var(--brass-rgb, 200, 147, 62), 0.7);
  box-shadow:
    inset 0 0 10px rgba(var(--brass-rgb, 200, 147, 62), 0.35),
    0 0 6px rgba(var(--brass-rgb, 200, 147, 62), 0.2);
}

/* États des tirs */
.cell.hit {
  z-index: 1;
  background: #f87171 !important;
  border-color: #f87171;
  box-shadow: inset 0 0 15px #000;
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
  z-index: 2;
  outline: 2px solid #fbbf24;
  background: rgba(251, 191, 36, 0.2) !important;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}

.cell.pending {
  position: relative;
  background-color: rgba(245, 158, 11, 0.6) !important;
  cursor: not-allowed;
}

.cell.pending::after {
  content: "⏳";
  font-size: 12px;
}

/* ── 6. SYSTÈME DE CIBLAGE & LABELS ── */
.grid-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: var(--accent, #1de9c0);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 2px;
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

.target-select {
  margin-left: 10px;
  padding: 4px 8px;
  background: rgba(6, 22, 33, 0.8);
  border: 1px solid rgba(248, 113, 113, 0.5);
  border-radius: 4px;
  color: #f87171;
  font-family: "Rajdhani";
  font-size: 1rem;
  outline: none;
}

.active-target {
  text-shadow: 0 0 10px rgba(248, 113, 113, 0.6);
}

.target-indicator {
  margin-left: 8px;
  color: #fca5a5;
  font-size: 0.8rem;
  animation: pulse 1s infinite alternate;
}

/* ── 7. MODULE TIMER ── */
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
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: rgba(var(--accent-rgb, 29, 233, 192), 0.15);
  stroke-width: 4;
}

.timer-bar {
  fill: none;
  stroke: var(--accent, #1de9c0);
  stroke-width: 4;
  stroke-dasharray: 282.7;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px var(--accent, #1de9c0));
  transition:
    stroke-dashoffset 1s linear,
    stroke 0.3s;
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
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

/* ── 8. ALLIÉS ── */
.allies-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 15px;
  width: 100%;
  max-width: 380px;
}

.ally-mini-block {
  padding: 10px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.04);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.22);
  border-radius: 4px;
}

.mini-label {
  margin-bottom: 8px;
  color: var(--accent, #1de9c0);
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 1px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.08);
}

.ally-cell {
  background: #030a10;
  border: none;
  cursor: default;
}

/* ── 9. HUD / VICTOIRE / RÉCOMPENSES ── */
.hud-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 8, 13, 0.85);
  backdrop-filter: blur(8px);
}

.hud-popup {
  position: relative;
  width: 90%;
  max-width: 450px;
  padding: 40px 30px;
  background: linear-gradient(
    160deg,
    rgba(var(--ocean-mid, 13, 33, 55), 0.98) 0%,
    rgba(var(--ocean-deep, 6, 22, 33), 0.99) 100%
  );
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.35);
  border-radius: 4px;
  text-align: center;
  box-shadow:
    0 0 50px rgba(0, 0, 0, 0.8),
    inset 0 0 30px rgba(var(--accent-rgb, 29, 233, 192), 0.04),
    0 0 60px rgba(var(--accent-rgb, 29, 233, 192), 0.06);
}

.glow-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent, #1de9c0);
  box-shadow: 0 0 15px var(--accent, #1de9c0);
}

/* Variantes Popup */
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
  margin-bottom: 10px;
  font-size: 3.5rem;
  display: block;
}
.popup-result-title {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 4px;
  margin: 0;
}

/* Récompenses */
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
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.05);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.2);
  border-left: 4px solid var(--accent, #1de9c0);
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
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.7rem;
  letter-spacing: 2px;
}

.levelup-gold-note {
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px dashed rgba(251, 191, 36, 0.4);
  color: rgba(251, 191, 36, 0.8);
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.levelup-gold-amount {
  font-weight: 700;
  color: #fbbf24;
}

.levelup-banner {
  padding: 12px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid #fbbf24;
  color: #fbbf24;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
  animation: pulse 1.5s infinite alternate;
}

.xp-module {
  margin-top: 5px;
}
.xp-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  letter-spacing: 2px;
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
  background: linear-gradient(90deg, var(--accent, #1de9c0), var(--brass, #c8933e));
  box-shadow: 0 0 12px var(--accent, #1de9c0);
  transition: width 1s ease 0.5s;
}

.btn-radar {
  width: 100%;
  padding: 15px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.15);
  border: 1px solid var(--accent, #1de9c0);
  color: var(--accent, #1de9c0);
  font-family: "Rajdhani";
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-radar:hover {
  background: var(--accent, #1de9c0);
  color: #02080d;
  box-shadow: 0 0 20px rgba(var(--accent-rgb, 29, 233, 192), 0.4);
}

/* Loading */
.rewards-loading {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 30px 0;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: var(--brass, #c8933e);
  border-radius: 50%;
  animation: dotBounce 1s infinite;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* ── 10. FOG OF WAR (MASQUE GRILLE) ── */
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
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.15);
  border-radius: 4px;
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.grid-mask-icon {
  font-size: 1.8rem;
  opacity: 0.6;
}
.grid-mask-text {
  color: rgba(var(--accent-rgb, 29, 233, 192), 0.4);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 3px;
}
.grid-blurred {
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
}

.btn-hide-grid {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 3px 10px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.08);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.3);
  border-radius: 3px;
  color: var(--accent, #1de9c0);
  font-family: "Rajdhani", sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.2s,
    box-shadow 0.2s;
}

.btn-hide-grid:hover {
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.18);
  box-shadow: 0 0 8px rgba(var(--accent-rgb, 29, 233, 192), 0.2);
}

/* Transitions Vue */
.mask-fade-enter-active,
.mask-fade-leave-active {
  transition: opacity 0.25s ease;
}
.mask-fade-enter-from,
.mask-fade-leave-to {
  opacity: 0;
}

/* ── 11. SETTINGS MODAL ── */
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
  padding: 12px 15px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.04);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.12);
  border-radius: 4px;
}

.settings-modal-label {
  margin: 0 0 10px;
  color: var(--accent, #1de9c0);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
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
  flex: 1;
  height: 4px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.2);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
}

.settings-modal-slider::-webkit-slider-thumb {
  width: 14px;
  height: 18px;
  background: var(--accent, #1de9c0);
  border-radius: 1px;
  box-shadow: 0 0 5px rgba(var(--accent-rgb, 29, 233, 192), 0.5);
  cursor: pointer;
  -webkit-appearance: none;
}

.settings-modal-value {
  min-width: 46px;
  padding: 3px 8px;
  background: rgba(var(--accent-rgb, 29, 233, 192), 0.1);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.3);
  color: var(--accent, #1de9c0);
  font-family: monospace;
  font-size: 0.85rem;
  text-align: center;
}

.settings-modal-select {
  width: 100%;
  padding: 8px 12px;
  background: rgba(3, 10, 16, 0.9);
  border: 1px solid rgba(var(--accent-rgb, 29, 233, 192), 0.4);
  border-radius: 2px;
  color: var(--accent, #1de9c0);
  font-family: "Rajdhani", sans-serif;
  font-size: 0.9rem;
  letter-spacing: 1px;
  outline: none;
}

/* ── 12. ANIMATIONS (KEYFRAMES) ── */
.damage-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  box-shadow: inset 0 0 100px rgba(150, 0, 0, 0.2);
  animation: heartbeat infinite ease-in-out;
}

.radar-ping {
  width: 12px;
  height: 12px;
  background: var(--accent, #1de9c0);
  border-radius: 50%;
  box-shadow: 0 0 15px var(--accent, #1de9c0);
  animation: ping 1.5s infinite ease-out;
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

@keyframes ping {
  0% {
    transform: scale(0.8);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 29, 233, 192), 0.7);
  }
  100% {
    transform: scale(2);
    opacity: 0;
    box-shadow: 0 0 0 10px rgba(var(--accent-rgb, 29, 233, 192), 0);
  }
}

@keyframes pulse {
  from {
    box-shadow: 0 0 5px rgba(251, 191, 36, 0.1);
  }
  to {
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.3);
  }
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
    box-shadow: 0 0 10px var(--accent, #1de9c0);
  }
}

/* ── 13. RESPONSIVE ── */
@media (max-width: 850px) {
  .tactical-header h1 {
    font-size: 1rem;
  }

  .btn-tactical {
    justify-content: center;
    min-width: 40px;
    padding: 8px;
  }

  .btn-text,
  .hide-label {
    display: none;
  }
  .btn-icon {
    display: block;
    margin: 0;
    font-size: 1.2rem;
  }

  .tactical-layout {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 20px;
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

  .system-status {
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
  .btn-hide-grid {
    padding: 3px 7px;
  }
}
</style>
