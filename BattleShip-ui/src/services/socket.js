import { io } from "socket.io-client";

// CORRECTION 7 : warning explicite si la variable d'env est manquante
const SOCKET_URL = import.meta.env.VITE_API_URL;
if (!SOCKET_URL) {
  console.error("❌ VITE_API_URL non défini — la connexion socket va échouer.");
}

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  autoConnect: true,
  withCredentials: true,
});

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id || user?.ID_Users || null;
  } catch {
    return null;
  }
}

// CORRECTION 6 : stocker le gameId actif pour pouvoir rejoindre la room après reconnexion
let _activeGameId = null;

export function setActiveGame(gameId) {
  _activeGameId = gameId ? String(gameId) : null;
}

export function clearActiveGame() {
  _activeGameId = null;
}

socket.on("connect", () => {
  console.info("🔌 Socket connecté :", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("🔌 Socket déconnecté :", reason);
  if (reason === "io server disconnect") {
    socket.connect();
  }
});

socket.on("reconnect_failed", () => {
  console.error("❌ Socket : échec de reconnexion définitif");
  window.dispatchEvent(new CustomEvent("socket-unreachable"));
});

// CORRECTION 6 : après reconnexion, restaurer toutes les rooms (user + game en cours)
socket.on("reconnect", (attempt) => {
  console.info(`✅ Socket reconnecté après ${attempt} tentative(s)`);
  const userId = getUserId();
  if (userId) {
    registerOnline(userId);
    // join-user-room était manquant ici — rooms perdues après reconnexion
    socket.emit("join-user-room", { userId: Number(userId) });
  }
  // Rejoindre la room de la partie en cours si elle existe
  if (_activeGameId) {
    socket.emit("join-game", { gameId: _activeGameId });
  }
});

export function registerOnline(userId) {
  if (userId) socket.emit("register-user", { userId: Number(userId) });
}

export function rejoinGame(gameId, userId) {
  if (gameId) {
    socket.emit("join-game", { gameId: String(gameId) });
    // Mémoriser la partie active pour la reconnexion automatique
    setActiveGame(gameId);
  }
  if (userId) socket.emit("join-user-room", { userId: Number(userId) });
}

export function isConnected() {
  return socket.connected;
}

export default socket;