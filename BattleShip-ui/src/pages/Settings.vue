<template>
  <div class="settings-wrapper">

    <!-- Overlay -->
    <div class="overlay"></div>

    <!-- Header -->
<div class="top-bar">
  <div class="header-content">
    <button class="back-button" @click="$router.push('/')">
      ⬅ Retour
    </button>

    <div class="title-container">
      <span class="settings-icon">⚙️</span>
      <h1>Paramètres du jeu</h1>
    </div>

    <!-- Espace invisible pour équilibrer -->
    <div class="header-spacer"></div>
  </div>
</div>

    <!-- Carte centrale -->
    <div class="settings-card">

      <!-- AUDIO -->
      <section>
        <h2>🎵 Audio</h2>

        <div class="field">
          <label>Volume musique</label>
          <input 
            type="range" 
            v-model="settingsStore.musicVolume" 
            min="0" 
            max="100"
          />
          <span>{{ settingsStore.musicVolume }}%</span>
        </div>

        <div class="field">
          <label>Volume effets</label>
          <input 
            type="range" 
            v-model="settingsStore.effectsVolume" 
            min="0" 
            max="100"
          />
          <span>{{ settingsStore.effectsVolume }}%</span>
        </div>
      </section>

      <!-- LANGUE -->
      <section>
        <h2>🌍 Langue</h2>

        <div class="field">
          <label>Choisir la langue</label>
          <select v-model="settingsStore.language">
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </section>

    </div>
  </div>
</template>

<script>
import { settingsStore, saveSettings } from "@/stores/settings";

export default {
  name: "SettingsPage",
  setup() {

    const handleSave = () => {
      saveSettings();
    };

    return {
      settingsStore,
    };
  },
};
</script>

<style scoped>

/* WRAPPER AVEC IMAGE DE FOND */
.settings-wrapper {
  position: relative;
  min-height: 100vh;
  background-image: url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 40px;
  overflow: hidden;
}

/* Overlay sombre */
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    rgba(0, 0, 40, 0.7),
    rgba(0, 0, 80, 0.8)
  );
  z-index: 0;
}

/* HEADER FLOTTANT PREMIUM */
.top-bar {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.header-content {
  width: 90%;
  max-width: 900px;
  padding: 15px 25px;
  border-radius: 18px;

  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;

  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);

  box-shadow: 
    0 0 20px rgba(0, 150, 255, 0.4),
    0 0 40px rgba(0, 80, 200, 0.2);
}

/* TITRE */
.title-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.settings-icon {
  font-size: 22px;
}

h1 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 1px;
  color: white;
}

/* BOUTON RETOUR */
.back-button {
  justify-self: start;
  background: linear-gradient(90deg, #00bfff, #0072ff);
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: white;
  font-weight: bold;
  transition: 0.3s;
}

.back-button:hover {
  transform: translateX(-3px);
  box-shadow: 0 0 10px #00bfff;
}

/* Spacer invisible pour équilibrer la grille */
.header-spacer {
  width: 80px;
}

/* CARTE CENTRALE */
.settings-card {
  position: relative;
  z-index: 2;
  margin-top: 30px;
  width: 90%;
  max-width: 700px;
  padding: 40px;
  border-radius: 20px;

  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255,255,255,0.2);

  box-shadow: 
    0 0 30px rgba(0, 140, 255, 0.4),
    0 0 60px rgba(0, 80, 200, 0.3);

  color: white;
  animation: fadeIn 0.6s ease;
}

/* SECTIONS */
h2 {
  margin-bottom: 20px;
  margin-top: 25px;
  font-size: 20px;
}

/* FIELDS */
.field {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.field label {
  min-width: 150px;
}

.field input[type="range"] {
  flex: 1;
  accent-color: #00bfff;
}

.field select {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #002f4b;
  color: white;
}

/* SAVE BUTTON */
.save-button {
  margin-top: 30px;
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;

  background: linear-gradient(90deg, #00bfff, #0072ff);
  color: white;

  transition: 0.3s;
}

.save-button:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px #00bfff;
}

/* BOUTON RETOUR */
.back-button {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.3);
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: white;
  transition: 0.3s;
}

.back-button:hover {
  background: rgba(255,255,255,0.3);
}

/* Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>