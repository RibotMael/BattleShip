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

function startTurn(gameId, duration = 7) {
  if (games[gameId] && games[gameId].timer) {
    clearInterval(games[gameId].timer);
    console.log(`🧹 Ancien timer nettoyé pour la partie ${gameId}`);
  }

  // Réinitialisation complète de l'état de la partie
  games[gameId] = {
    timer: null,
    turnStartAt: Date.now(),
    ended: false,
    finished: false,
    duration: duration
  };

  games[gameId].timer = setInterval(() => {
    if (games[gameId].finished) {
      clearInterval(games[gameId].timer);
      delete games[gameId]; 
      return;
    }

    const elapsed = Date.now() - games[gameId].turnStartAt;
    const timeLeft = Math.max(0, Math.ceil(games[gameId].duration - elapsed / 1000));

    io.to(String(gameId)).emit("turn-timer", { timeLeft });

    if (timeLeft <= 0 && !games[gameId].ended) {
      games[gameId].ended = true;
      
      console.log(`⌛ Fin du tour pour la partie ${gameId}`);
      io.to(String(gameId)).emit("turn-ended", { reason: "timeout" });

      // Petit délai pour laisser le temps aux tirs de se résoudre
      setTimeout(() => {
        if (games[gameId] && !games[gameId].finished) {
          games[gameId].turnStartAt = Date.now();
          games[gameId].ended = false;
        }
      }, 1500); 
    }
  }, 1000);
}

/* ==========================
   SOCKET.IO EVENTS
========================== */

io.on("connection", (socket) => {
  // 1. Le joueur rejoint la room
  socket.on("join-game", ({ gameId }) => {
    socket.join(String(gameId));
  });

  // 2. Le joueur confirme qu'il est chargé et prêt à voir le chrono
  socket.on("player-ready", async ({ gameId, playerId }) => {
    const sId = String(gameId);
  
    // 1. On vérifie en BDD qui a validé sa grille
    const [players] = await db.query(
        "SELECT player_id FROM player_boards WHERE game_id = ? AND validated = 1", 
        [sId]
    );


    const readyCount = players.length;

    // 2. On récupère le nombre total de joueurs inscrits dans la partie
    const [totalRows] = await db.query(
        "SELECT count(*) as count FROM game_players WHERE id_game = ?", 
        [sId]
    );
    const totalExpected = totalRows[0].count;

    console.log(`📢 Joueur ${playerId} est sur l'écran de combat. Grilles validées : ${readyCount}/${totalExpected}`);

    // 3. On ne lance le jeu que si le nombre de grilles validées == nombre de joueurs
    if (readyCount >= totalExpected) {
        if (!games[sId] || !games[sId].timer) {
            console.log("🚀 Toutes les grilles sont validées ! Lancement.");
            if (!games[sId]) games[sId] = {};
            startTurn(sId);
        }
    } else {
        io.to(sId).emit("waiting-for-players", { 
            ready: readyCount, 
            total: totalExpected 
        });
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
