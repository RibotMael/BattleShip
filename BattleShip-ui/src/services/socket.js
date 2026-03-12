// src/services/socket.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

console.log("🔌 Socket URL utilisée :", SOCKET_URL);

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 10000,
  autoConnect: true,
});

// Logs utiles en dev
socket.on("connect", () => {
  console.log("⚡ Socket connecté :", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("🔌 Socket déconnecté :", reason);
});

socket.on("connect_error", (err) => {
  console.error("❌ Erreur de connexion Socket:", err.message);
});

export default socket;