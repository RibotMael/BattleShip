<template>
  <div class="battle-page background-tactical">
    <header class="tactical-header">
      <div class="header-left">
        <div class="radar-ping"></div>
        <h1>CONFIGURATION SYSTÈME</h1>
      </div>
      <div class="header-right">
        <button class="btn-tactical" @click="goBack">
          <span class="btn-text">{{ backLabel }}</span>
          <span class="btn-icon">⬅</span>
        </button>
      </div>
    </header>

    <main class="tactical-layout settings-layout">
      <div class="settings-container">
        <section class="settings-section">
          <h2 class="grid-label"><span class="dot"></span> MODULE AUDIO</h2>
          <div class="settings-content">
            <div class="field-tactical">
              <label>VOLUME MUSIQUE D'AMBIANCE</label>
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
              <label>EFFETS SONORES DE COMBAT</label>
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
          <h2 class="grid-label"><span class="dot"></span> PARAMÈTRES VISUELS</h2>
          <div class="settings-content">
            <div class="field-tactical">
              <label>QUALITÉ DES RENDUS</label>
              <select v-model="settingsStore.graphicsQuality" class="select-tactical">
                <option value="low" class="opt-tactical">BASSE (PERFORMANCE)</option>
                <option value="medium" class="opt-tactical">OPTIMISÉE</option>
                <option value="high" class="opt-tactical">HAUTE RÉSOLUTION</option>
              </select>
            </div>
            <div class="field-tactical switch-wrapper">
              <label>EFFET D'IMMERSION (HEARTBEAT)</label>
              <label class="switch">
                <input type="checkbox" v-model="settingsStore.showHeartbeat" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="grid-label"><span class="dot"></span> SYSTÈME ET LANGUE</h2>
          <div class="settings-content">
            <div class="field-tactical">
              <label>LANGUE D'INTERFACE</label>
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

export default {
  setup() {
    return { settingsStore };
  },
  computed: {
    // Détermine si on vient d'une partie en cours
    fromGame() {
      return this.$route.query.from === "game";
    },
    backLabel() {
      return this.fromGame ? "RETOUR PARTIE" : "RETOUR BASE";
    },
  },
  methods: {
    goBack() {
      if (this.fromGame) {
        // Retour vers la partie avec les mêmes paramètres qu'à l'aller
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
/* --- FOND ET LAYOUT GLOBAL --- */
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
}

/* --- HEADER TACTIQUE --- */
.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: rgba(3, 10, 16, 0.85);
  border-bottom: 1px solid rgba(29, 233, 192, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1de9c0;
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(29, 233, 192, 0.4);
  font-family: "Rajdhani", "Courier New", Courier, monospace;
}

.radar-ping {
  width: 12px;
  height: 12px;
  background-color: #1de9c0;
  border-radius: 50%;
  position: relative;
}

.radar-ping::after {
  content: "";
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
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

.btn-tactical {
  background: rgba(3, 10, 16, 0.6);
  border: 1px solid rgba(29, 233, 192, 0.5);
  color: #1de9c0;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-family: "Rajdhani", "Courier New", Courier, monospace;
  font-weight: bold;
  letter-spacing: 1px;
  transition: all 0.2s ease-in-out;
}

.btn-tactical:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 12px rgba(29, 233, 192, 0.3);
}

.btn-icon {
  display: none;
}

/* --- STRUCTURE DES PARAMÈTRES --- */
.settings-layout {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  flex: 1;
}

.settings-container {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.settings-section {
  background: rgba(3, 10, 16, 0.7);
  border: 1px solid rgba(29, 233, 192, 0.15);
  border-radius: 2px;
  padding: 25px;
  position: relative;
  overflow: hidden;
  font-family: "Rajdhani", "Courier New", Courier, monospace;
}

.settings-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(29, 233, 192, 0.02) 50%);
  background-size: 100% 4px;
  pointer-events: none;
}

.grid-label {
  font-size: 1.1rem;
  color: white;
  margin-top: 0;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 1.5px;
}

.dot {
  width: 6px;
  height: 6px;
  background-color: #1de9c0;
  display: inline-block;
  box-shadow: 0 0 5px #1de9c0;
}

/* --- CONTROLES FORMULAIRE --- */
.field-tactical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 25px;
  position: relative;
  z-index: 1;
}

.field-tactical:last-child {
  margin-bottom: 0;
}

.field-tactical label {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 1.2px;
  color: #1de9c0;
  margin-bottom: 5px;
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

.tactical-slider {
  -webkit-appearance: none;
  flex: 1;
  height: 4px;
  background: rgba(29, 233, 192, 0.2);
  outline: none;
  border-radius: 2px;
}

.tactical-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 18px;
  background: #1de9c0;
  cursor: pointer;
  border-radius: 1px;
  box-shadow: 0 0 5px rgba(29, 233, 192, 0.5);
}

.value-tag {
  font-family: monospace;
  background: rgba(29, 233, 192, 0.1);
  padding: 4px 10px;
  border: 1px solid rgba(29, 233, 192, 0.3);
  color: #1de9c0;
  min-width: 50px;
  text-align: center;
}

.select-tactical {
  background: rgba(3, 10, 16, 0.9);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.4);
  padding: 10px 40px 10px 15px;
  font-family: inherit;
  font-size: 0.9rem;
  letter-spacing: 1px;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231de9c0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
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

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.1);
  transition: 0.3s;
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 2px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: rgba(255, 255, 255, 0.5);
  transition: 0.3s;
  border-radius: 1px;
}

input:checked + .slider {
  background-color: rgba(29, 233, 192, 0.15);
  border-color: #1de9c0;
}

input:checked + .slider:before {
  transform: translateX(26px);
  background-color: #1de9c0;
  box-shadow: 0 0 8px rgba(29, 233, 192, 0.6);
}

/* Mobile */
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
}
</style>
