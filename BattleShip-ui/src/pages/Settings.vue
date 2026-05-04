<template>
  <div class="battle-page background-tactical">
    <header class="tactical-header">
      <div class="header-left">
        <div class="radar-ping"></div>
        <h1>{{ i18nStore.t("settings_title") }}</h1>
      </div>
      <div class="header-right">
        <button class="btn-tactical" @click="goBack">
          <span class="btn-text">{{
            i18nStore.t(fromGame ? "settings_back_game" : "settings_back_home")
          }}</span>
          <span class="btn-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </span>
        </button>
      </div>
    </header>

    <main class="tactical-layout settings-layout">
      <div class="settings-container">
        <section class="settings-section">
          <h2 class="grid-label"><span class="dot"></span>{{ i18nStore.t("settings_audio") }}</h2>
          <div class="settings-content">
            <div class="field-tactical">
              <label>{{ i18nStore.t("settings_music") }}</label>
              <div class="input-wrapper">
                <input
                  type="range"
                  v-model="settingsStore.musicVolume"
                  min="0"
                  max="100"
                  class="tactical-slider"
                />
                <span class="value-tag">{{ settingsStore.musicVolume }}%</span>
              </div>
            </div>
            <div class="field-tactical">
              <label>{{ i18nStore.t("settings_effects") }}</label>
              <div class="input-wrapper">
                <input
                  type="range"
                  v-model="settingsStore.effectsVolume"
                  min="0"
                  max="100"
                  class="tactical-slider"
                />
                <span class="value-tag">{{ settingsStore.effectsVolume }}%</span>
              </div>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="grid-label"><span class="dot"></span>{{ i18nStore.t("settings_visuals") }}</h2>
          <div class="settings-content">
            <div class="field-tactical switch-wrapper">
              <label>{{ i18nStore.t("settings_heartbeat") }}</label>
              <label class="switch">
                <input type="checkbox" v-model="settingsStore.showHeartbeat" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="grid-label"><span class="dot"></span>{{ i18nStore.t("settings_system") }}</h2>
          <div class="settings-content">
            <div class="field-tactical">
              <label>{{ i18nStore.t("settings_language") }}</label>
              <select v-model="settingsStore.language" class="select-tactical">
                <option value="fr" class="opt-tactical">FRANÇAIS (HQ)</option>
                <option value="en" class="opt-tactical">ENGLISH (NATO)</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { settingsStore } from "@/stores/settings";
import { i18nStore } from "@/stores/i18n";

export default {
  setup() {
    return { settingsStore, i18nStore };
  },
  computed: {
    // Détermine si on vient d'une partie en cours
    fromGame() {
      return this.$route.query.from === "game";
    },
    backLabel() {
      return this.fromGame
        ? this.i18nStore.t("settings_back_game")
        : this.i18nStore.t("settings_back_home");
    },
  },
  methods: {
    goBack() {
      if (this.fromGame) {
        this.$router.push({
          path: `/game/${this.$route.query.gameId}`,
          query: { gameType: this.$route.query.gameType },
        });
      } else {
        this.$router.push("/");
      }
    },
  },
};
</script>

<style scoped>
/* ── 1. FOND ET LAYOUT GLOBAL ── */
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.battle-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.background-tactical {
  background-color: #030a10;
  background-image:
    linear-gradient(rgba(29, 233, 192, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(29, 233, 192, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  color: #e0e0e0;
  font-family: "Inter", sans-serif;
}

/* ── 2. HEADER TACTIQUE ── */
.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: rgba(3, 10, 16, 0.85);
  backdrop-filter: blur(5px);
  border-bottom: 1px solid rgba(29, 233, 192, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h1 {
  margin: 0;
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.5rem;
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(29, 233, 192, 0.4);
}

/* Animation Radar */
.radar-ping {
  position: relative;
  width: 12px;
  height: 12px;
  background-color: #1de9c0;
  border-radius: 50%;
}

.radar-ping::after {
  content: "";
  position: absolute;
  inset: -4px;
  border: 1px solid #1de9c0;
  border-radius: 50%;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* Boutons Header */
.btn-tactical {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(3, 10, 16, 0.6);
  border: 1px solid rgba(29, 233, 192, 0.5);
  color: #1de9c0;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-tactical:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 12px rgba(29, 233, 192, 0.3);
}

.btn-icon {
  display: none;
}

/* ── 3. STRUCTURE DES PARAMÈTRES ── */
.settings-layout {
  display: flex;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
  width: 100%;
  max-width: 700px;
}

.settings-section {
  position: relative;
  padding: 25px;
  background: rgba(3, 10, 16, 0.7);
  border: 1px solid rgba(29, 233, 192, 0.15);
  border-radius: 2px;
  overflow: hidden;
  font-family: "Rajdhani", sans-serif;
}

/* Effet Scanline interne */
.settings-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(29, 233, 192, 0.02) 50%);
  background-size: 100% 4px;
  pointer-events: none;
}

.grid-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 0;
  margin-bottom: 20px;
  color: white;
  font-size: 1.1rem;
  letter-spacing: 1.5px;
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: #1de9c0;
  box-shadow: 0 0 5px #1de9c0;
}

/* ── 4. CONTRÔLES FORMULAIRE (INPUTS) ── */
.field-tactical {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 25px;
}

.field-tactical:last-child {
  margin-bottom: 0;
}

.field-tactical label {
  margin-bottom: 5px;
  color: #1de9c0;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

.switch-wrapper {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Sliders Tactiques */
.tactical-slider {
  flex: 1;
  height: 4px;
  background: rgba(29, 233, 192, 0.2);
  outline: none;
  border-radius: 2px;
  -webkit-appearance: none;
}

.tactical-slider::-webkit-slider-thumb {
  width: 14px;
  height: 18px;
  background: #1de9c0;
  border-radius: 1px;
  box-shadow: 0 0 5px rgba(29, 233, 192, 0.5);
  cursor: pointer;
  -webkit-appearance: none;
}

.value-tag {
  min-width: 50px;
  padding: 4px 10px;
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
  font-family: monospace;
  text-align: center;
}

/* Selects Tactiques */
.select-tactical {
  width: 100%;
  padding: 10px 40px 10px 15px;
  background: rgba(3, 10, 16, 0.9);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231de9c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
  border: 1px solid rgba(29, 233, 192, 0.4);
  color: #1de9c0;
  font-family: inherit;
  font-size: 0.9rem;
  letter-spacing: 1px;
  outline: none;
  cursor: pointer;
  appearance: none;
}

.opt-tactical {
  background-color: #030a10 !important;
  color: #1de9c0 !important;
}

.select-tactical:focus,
.select-tactical:hover {
  border-color: #1de9c0;
  box-shadow: 0 0 10px rgba(29, 233, 192, 0.2);
}

/* ── 5. TOGGLE SWITCH ── */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  width: 0;
  height: 0;
  opacity: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 2px;
  cursor: pointer;
  transition: 0.3s;
}

.slider:before {
  content: "";
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 1px;
  transition: 0.3s;
}

input:checked + .slider {
  background-color: rgba(29, 233, 192, 0.15);
  border-color: #1de9c0;
}

input:checked + .slider:before {
  background-color: #1de9c0;
  box-shadow: 0 0 8px rgba(29, 233, 192, 0.6);
  transform: translateX(26px);
}

/* ── 6. RESPONSIVE MOBILE ── */
@media (max-width: 600px) {
  .btn-text {
    display: none;
  }
  .btn-icon {
    display: block;
  }
  .tactical-header {
    padding: 12px 16px;
  }
  .settings-layout {
    padding: 20px 10px;
  }
}
</style>
