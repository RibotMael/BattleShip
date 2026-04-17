import { reactive, watch } from "vue";

const defaultSettings = {
  musicVolume: 50,
  effectsVolume: 50,
  graphicsQuality: "medium",
  showHeartbeat: true,      
  language: "fr",
};

const saved = JSON.parse(localStorage.getItem("gameSettings") || "null");

export const settingsStore = reactive(saved || defaultSettings);

watch(
  settingsStore,
  (newSettings) => {
    localStorage.setItem("gameSettings", JSON.stringify(newSettings));
    console.log("Paramètres sauvegardés :", newSettings);
  },
  { deep: true }
);