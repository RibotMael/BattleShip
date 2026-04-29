import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 10000,
  autoConnect: true,
});

function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id || user?.ID_Users || null;
  } catch { return null; }
}

socket.on("connect", () => {
  const userId = getUserId();
  // "register-user" = ce que le serveur écoute réellement
  if (userId) socket.emit("register-user", { userId: Number(userId) });
});

socket.on("disconnect", (reason) => {
  console.warn("🔌 Socket déconnecté :", reason);
});

export function registerOnline(userId) {
  if (userId) socket.emit("register-user", { userId: Number(userId) });
}

export default socket;