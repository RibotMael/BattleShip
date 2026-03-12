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
const server = http.createServer(app);

/* ==========================
   MIDDLEWARE CORS (FIXED)
========================== */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://battle-ship-seven.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow internal requests or tools like Postman (no origin)
    if (!origin) return callback(null, true);

    // 2. Check if the origin is in our list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      // 3. Optional: Fallback for subdomains or dynamic localhosts
      const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
      if (isLocalhost) {
        return callback(null, true);
      }
      
      return callback(new Error("Accès refusé par CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

/* ==========================
   SOCKET.IO CONFIGURATION
========================== */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Rendre io accessible globalement de manière propre
app.set("io", io);

/* ==========================
   TIMER SERVEUR (LOGIQUE)
========================== */
const games = {};

/**
 * Démarre ou réinitialise le tour d'une partie
 */
function startTurn(gameId, duration = 7) {
  const sId = String(gameId);

  // Nettoyage si un timer existe déjà
  if (games[sId]?.timer) {
    clearInterval(games[sId].timer);
  }

  if (!games[sId]) {
    games[sId] = { turnNumber: 0 };
  }

  games[sId].turnStartAt = Date.now();
  games[sId].duration = duration;
  games[sId].ended = false;
  games[sId].finished = false;
  games[sId].turnNumber++;

  const interval = setInterval(() => {
    if (!games[sId] || games[sId].finished) {
      clearInterval(interval);
      return;
    }

    const elapsed = (Date.now() - games[sId].turnStartAt) / 1000;
    const timeLeft = Math.max(0, Math.ceil(duration - elapsed));

    // Diffusion du temps restant
    io.to(sId).emit("turn-timer", { timeLeft, gameId: sId });

    if (timeLeft <= 0 && !games[sId].ended) {
      games[sId].ended = true;
      clearInterval(interval);

      io.to(sId).emit("turn-ended", { reason: "timeout", gameId: sId });

      // Délai avant le prochain tour pour laisser le front respirer
      setTimeout(() => {
        if (games[sId] && !games[sId].finished) {
          startTurn(sId, duration);
        }
      }, 1500);
    }
  }, 1000);

  games[sId].timer = interval;
}

function stopGameTimer(gameId) {
  const sId = String(gameId);
  if (games[sId]) {
    clearInterval(games[sId].timer);
    games[sId].finished = true;
    delete games[sId];
    console.log(`🛑 Timer arrêté : ${sId}`);
  }
}

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
   SOCKET.IO EVENTS
========================== */
io.on("connection", (socket) => {
  console.log(`🔌 Connecté : ${socket.id}`);

  socket.on("join-game", ({ gameId }) => {
    if (!gameId) return;
    const room = String(gameId);
    socket.join(room);
    console.log(`👤 Joueur ${socket.id} -> Room ${room}`);
  });

  socket.on("player-ready", async ({ gameId, playerId }) => {
    const sId = String(gameId);
    try {
      // Vérifier l'état des grilles en DB
      const [players] = await db.query(
        "SELECT player_id FROM player_boards WHERE game_id = ? AND validated = 1", 
        [sId]
      );
      
      const [totalRows] = await db.query(
        "SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?", 
        [sId]
      );

      const readyCount = players.length;
      const totalExpected = totalRows[0].count;

      if (readyCount >= totalExpected && totalExpected > 0) {
        // On ne lance le timer que s'il n'est pas déjà actif
        if (!games[sId] || !games[sId].timer) {
          console.log(`🚀 Lancement partie ${sId}`);
          io.to(sId).emit("game-started", { timeLeft: 7 });
          startTurn(sId);
        }
      } else {
        io.to(sId).emit("waiting-for-players", { ready: readyCount, total: totalExpected });
      }
    } catch (err) {
      console.error("❌ Erreur player-ready:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🚫 Déconnexion socket");
  });
});

/* ==========================
   LANCEMENT
========================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Backend BattleShip sur le port ${PORT}`);
});

export { io, games, startTurn, stopGameTimer };