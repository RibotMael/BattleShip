import { reactive } from "vue";

const defaultSettings = {
  musicVolume: 50,
  effectsVolume: 50,
  notificationsEnabled: true,
  language: "fr",
};

const saved = JSON.parse(localStorage.getItem("gameSettings") || "null");

export const settingsStore = reactive(saved || defaultSettings);

export function saveSettings() {
  localStorage.setItem("gameSettings", JSON.stringify(settingsStore));
}