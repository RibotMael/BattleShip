import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import db from "./db.js";

dotenv.config();

// Routes
import authRoutes from "./routes/auth.js"; 
import userProfileRoutes from "./routes/user.js";  
import checkPseudoRoute from "./api/check-pseudo.js";
import avatarRouter from "./api/avatar.js";
import friendsRouter from "./routes/friends.js";
import invitationsRouter from "./routes/invitations.js";
import gamesRouter from "./routes/games.js";

const app = express();

/* ==========================
   MIDDLEWARE
========================== */

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

/* ==========================
   ROUTES API
========================== */

app.use("/api", authRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api", checkPseudoRoute);
app.use("/api/friends", friendsRouter);
app.use("/api/invitation", invitationsRouter);
app.use("/api", avatarRouter);
app.use("/api/games", gamesRouter);

app.get("/", (req, res) => {
  res.send("Bienvenue sur l'API BattleShip ! 🚢");
});

/* ==========================
   SERVER + SOCKET.IO
========================== */

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* ==========================
   TIMER SERVEUR
========================== */

const games = {};

function startTurn(gameId, duration = 8) {
  if (!games[gameId]) {
    games[gameId] = { finished: false };
  }

  clearInterval(games[gameId].timer);

  games[gameId].turnStartAt = Date.now();
  games[gameId].ended = false;

  games[gameId].timer = setInterval(() => {
    if (games[gameId].finished) {
      clearInterval(games[gameId].timer);
      return;
    }

    const elapsed = Date.now() - games[gameId].turnStartAt;
    const timeLeft = Math.max(0, Math.ceil(duration - elapsed / 1000));

    io.to(gameId).emit("turn-timer", { timeLeft });

    if (timeLeft <= 0 && !games[gameId].ended) {
      games[gameId].ended = true;

      // 🔥 TOUS les joueurs tirent maintenant
      io.to(gameId).emit("turn-ended", { reason: "timeout" });

      // Nouveau tour
      games[gameId].turnStartAt = Date.now();
      games[gameId].ended = false;
    }
  }, 1000);
}




/* ==========================
   SOCKET.IO EVENTS
========================== */

io.on("connection", (socket) => {
  console.log("🟢 Client connecté", socket.id);

  socket.on("join-game", ({ gameId, playerId }) => {
    console.log(`🎮 Joueur ${playerId} rejoint ${gameId}`);
    socket.join(gameId);

    const room = io.sockets.adapter.rooms.get(gameId);
    const count = room?.size || 0;

    console.log(`👥 Joueurs dans ${gameId}: ${count}`);

    if (count === 2 && !games[gameId]?.timer) {
      console.log("⏱️ Démarrage du chrono");
      startTurn(gameId);
    }
  });
});

/* ==========================
   404
========================== */

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

/* ==========================
   START
========================== */

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Backend Battleship en ligne sur http://localhost:${PORT}`);
});

export { io };
