// src/services/socket.js
import { io } from "socket.io-client";

const socket = io("https://battleship-api-i276.onrender.com", {
  transports: ["websocket", "polling"],
});
export default socket;
