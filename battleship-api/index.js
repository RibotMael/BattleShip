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
import shopRoutes from "./routes/shop.js";

const app = express();
const server = http.createServer(app);

/* ==========================
   MIDDLEWARE CORS
========================== */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://battle-ship-seven.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      const isLocalhost =
        origin.includes("localhost") || origin.includes("127.0.0.1");
      if (isLocalhost) return callback(null, true);
      return callback(new Error("Accès refusé par CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

app.set("io", io);

/* ==========================
   TIMER SERVEUR (LOGIQUE)
========================== */
const games = {};

// ─────────────────────────────────────────────────────────────
// NOUVEAU : Regroupe les cellules de chaque bateau par valeur
// board_json utilise des entiers > 0, chaque entier = un bateau
// ─────────────────────────────────────────────────────────────
function groupShipCells(board) {
  const shipMap = {};
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      const val = board[y][x];
      if (val > 0) {
        if (!shipMap[val]) shipMap[val] = [];
        shipMap[val].push({ x, y });
      }
    }
  }
  return Object.values(shipMap);
}

// ─────────────────────────────────────────────────────────────
// NOUVEAU : Résout TOUS les tirs pending d'une partie.
// Appelé à la fin de chaque tour, après que PHP/Unity/Vue ont
// eu le temps d'insérer leurs tirs en DB.
// ─────────────────────────────────────────────────────────────
async function resolveTurn(gameId) {
  const sId = String(gameId);

  try {
    // 1. Récupérer tous les tirs en attente (toutes plateformes)
    const [pendingShots] = await db.query(
      "SELECT * FROM shots WHERE id_game = ? AND state = 'pending'",
      [gameId]
    );

    if (!pendingShots.length) {
      return;
    }


    // 2. Charger les plateaux des cibles (cache pour éviter les requêtes répétées)
    const targetIds = [
      ...new Set(pendingShots.map((s) => Number(s.target_id))),
    ];
    const boardCache = {};
    await Promise.all(
      targetIds.map(async (tid) => {
        const [rows] = await db.query(
          "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ? LIMIT 1",
          [gameId, tid]
        );
        if (rows.length) boardCache[tid] = JSON.parse(rows[0].board_json);
      })
    );

    // 3. Résoudre chaque tir : hit / miss + détection coulé
    for (const shot of pendingShots) {
      const board = boardCache[Number(shot.target_id)];
      if (!board) {
        continue;
      }

      const cellValue = board[shot.target_y][shot.target_x];
      let result = cellValue > 0 ? "hit" : "miss";
      let positions = [];

      // Mettre à jour le tir en base
      await db.query(
        "UPDATE shots SET result = ?, state = 'resolved' WHERE id_shot = ?",
        [result, shot.id_shot]
      );

      // Vérifier si bateau coulé
      if (result === "hit") {
        // Trouver toutes les cellules de ce bateau (même valeur dans board_json)
        const shipCells = [];
        for (let y = 0; y < board.length; y++)
          for (let x = 0; x < board[y].length; x++)
            if (board[y][x] === cellValue) shipCells.push({ x, y });

        const conditions = shipCells
          .map(() => "(target_x=? AND target_y=?)")
          .join(" OR ");
        const values = shipCells.flatMap((p) => [p.x, p.y]);

        const [[{ hitCount }]] = await db.query(
          `SELECT COUNT(*) AS hitCount
           FROM shots
           WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
           AND (${conditions})`,
          [gameId, shot.target_id, ...values]
        );

        if (hitCount >= shipCells.length) {
          result = "sunk";
          positions = shipCells;
          await db.query(
            `UPDATE shots SET result='sunk'
             WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
             AND (${conditions})`,
            [gameId, shot.target_id, ...values]
          );
        }
      }

      // Émettre le résultat à tous les joueurs connectés (Vue, PHP-socket, Unity-socket)
      io.to(sId).emit("shot-fired", {
        gameId: sId,
        shooterId: shot.id_player,
        targetId: shot.target_id,
        x: shot.target_x,
        y: shot.target_y,
        result,
        positions,
        gameOver: false,
        winnerId: null,
      });
    }

    // 4. Vérifier les joueurs morts (toutes leurs cellules bateaux touchées/coulées)
    for (const tid of targetIds) {
      const board = boardCache[tid];
      if (!board) continue;

      const totalCells = board.flat().filter((c) => c > 0).length;
      const [[{ sunkCount }]] = await db.query(
        "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game=? AND target_id=? AND result='sunk'",
        [gameId, tid]
      );

      if (sunkCount >= totalCells) {
        const [upd] = await db.query(
          `UPDATE game_players SET player_status='dead'
           WHERE id_game=? AND id_player=? AND player_status='in_game'`,
          [gameId, tid]
        );
        if (upd.affectedRows > 0) {
          io.to(sId).emit("player-eliminated", {
            playerId: tid,
            reason: "shot",
          });
        }
      }
    }

    // 5. Vérifier la victoire
    const [alivePlayers] = await db.query(
      "SELECT id_player, team_number FROM game_players WHERE id_game=? AND player_status='in_game'",
      [gameId]
    );

    const isTeamMode = alivePlayers.some((p) => p.team_number !== null);
    let finished = false,
      winnerId = null,
      winnerTeam = null,
      isDraw = false;

    if (isTeamMode) {
      const aliveTeams = [
        ...new Set(
          alivePlayers.map((p) => p.team_number).filter((t) => t !== null)
        ),
      ];
      if (aliveTeams.length <= 1) {
        finished = true;
        isDraw = aliveTeams.length === 0;
        winnerTeam = isDraw ? null : aliveTeams[0];
        winnerId = isDraw
          ? null
          : (alivePlayers.find((p) => p.team_number === winnerTeam)
              ?.id_player ?? null);
      }
    } else {
      if (alivePlayers.length <= 1) {
        finished = true;
        isDraw = alivePlayers.length === 0;
        winnerId = isDraw ? null : alivePlayers[0].id_player;
      }
    }

    if (finished) {
      // Guard pour éviter la double-fin (PHP/Unity peuvent aussi finir la partie)
      const [updGame] = await db.query(
        "UPDATE games SET status='finished', winner_id=? WHERE id_Game=? AND status='in_progress'",
        [winnerId, gameId]
      );
      if (updGame.affectedRows > 0) {
        stopGameTimer(gameId);
        io.to(sId).emit("game-over", {
          winnerId,
          winnerTeam,
          isDraw,
          gameId: sId,
        });
      }
    }
  } catch (err) {
    // Mode silencieux 
  }
}

function _startTick(sId, duration) {
  if (games[sId]?.timer) clearInterval(games[sId].timer);

  const interval = setInterval(() => {
    if (!games[sId] || games[sId].finished) {
      clearInterval(interval);
      return;
    }

    const elapsed = (Date.now() - games[sId].turnStartAt) / 1000;
    const timeLeft = Math.max(0, Math.ceil(duration - elapsed));

    io.to(sId).emit("turn-timer", {
      timeLeft,
      gameId: sId,
      turnStartAt: games[sId].turnStartAt,
    });

    if (timeLeft <= 0 && !games[sId].ended) {
      games[sId].ended = true;
      clearInterval(interval);
      io.to(sId).emit("turn-ended", { reason: "timeout", gameId: sId });

      // MODIFIÉ : attendre 1.2s que tous les clients soumettent leurs tirs,
      // puis résoudre tous les tirs pending, puis démarrer le tour suivant
      setTimeout(async () => {
        if (!games[sId] || games[sId].finished) return;
        await resolveTurn(sId);
        if (games[sId] && !games[sId].finished) startTurn(sId, duration);
      }, 1200);
    }
  }, 1000);

  games[sId].timer = interval;
}

// ─────────────────────────────────────────────────────────────
// MODIFIÉ : Guard anti-doublon sur last_turn_timestamp
// Empêche Unity ET Node.js d'avancer le timer en même temps.
// Si Unity a déjà mis à jour le timestamp, Node.js se resynchronise
// depuis la DB au lieu de créer un conflit.
// ─────────────────────────────────────────────────────────────
async function startTurn(gameId, duration = 7) {
  const sId = String(gameId);

  if (games[sId]?.timer) clearInterval(games[sId].timer);
  if (!games[sId]) games[sId] = { turnNumber: 0 };

  try {
    // Vérifier que la partie est toujours en cours + lire le timestamp actuel
    const [[gameRow]] = await db.query(
      "SELECT status, last_turn_timestamp FROM games WHERE id_Game = ?",
      [sId]
    );

    if (!gameRow || gameRow.status !== "in_progress") {
      return;
    }

    const prevTimestamp = gameRow.last_turn_timestamp ?? 0;
    const turnStartAt = Date.now();
    const unixNow = Math.floor(turnStartAt / 1000);

    const [upd] = await db.query(
      `UPDATE games
       SET last_turn_timestamp = ?, current_round = current_round + 1
       WHERE id_Game = ?
         AND last_turn_timestamp = ?
         AND status = 'in_progress'`,
      [unixNow, sId, prevTimestamp]
    );

    if (upd.affectedRows === 0) {

      const [[freshRow]] = await db.query(
        "SELECT last_turn_timestamp FROM games WHERE id_Game = ?",
        [sId]
      );
      if (!freshRow) return;

      const elapsed = Date.now() / 1000 - (freshRow.last_turn_timestamp || 0);
      const syncedTimeLeft = Math.max(0, Math.ceil(duration - elapsed));

      games[sId].turnStartAt = (freshRow.last_turn_timestamp || 0) * 1000;
      games[sId].duration = duration;
      games[sId].ended = false;
      games[sId].finished = false;
      games[sId].turnNumber = (games[sId].turnNumber || 0) + 1;

      // Informer les clients Vue du timer resynchronisé
      io.to(sId).emit("turn-timer", {
        timeLeft: syncedTimeLeft,
        gameId: sId,
        turnStartAt: games[sId].turnStartAt,
      });

      _startTick(sId, duration);
      return;
    }

    // Cas normal : Node.js est maître de ce tour
    games[sId].turnStartAt = turnStartAt;
    games[sId].duration = duration;
    games[sId].ended = false;
    games[sId].finished = false;
    games[sId].turnNumber = (games[sId].turnNumber || 0) + 1;

    io.to(sId).emit("turn-timer", {
      timeLeft: duration,
      gameId: sId,
      turnStartAt,
    });

    _startTick(sId, duration);
  } catch (err) {
    // Mode silencieux 
  }
}

function stopGameTimer(gameId) {
  const sId = String(gameId);
  if (games[sId]) {
    clearInterval(games[sId].timer);
    games[sId].finished = true;
    delete games[sId];
  }
}

/* ==========================
   ROUTES API
========================== */
app.use("/api", authRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api/shop", shopRoutes);
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
  });

  socket.on("player-ready", async ({ gameId, playerId }) => {
    const sId = String(gameId);
    try {
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
        if (!games[sId] || !games[sId].timer) {
          io.to(sId).emit("game-started", { timeLeft: 7 });
          startTurn(sId);
        }
      } else {
        io.to(sId).emit("waiting-for-players", {
          ready: readyCount,
          total: totalExpected,
        });
      }
    } catch (err) {
      // Mode silencieux 
    }
  });

  socket.on("disconnect", () => {
    console.log("🚫 Déconnexion socket");
  });

  socket.on("lock-cell", (data) => {
    socket.to(data.gameId).emit("cell-pending", {
      targetId: data.targetId,
      index: data.index,
      shooterId: data.shooterId,
    });
  });

  socket.on("unlock-cell", (data) => {
    socket.to(data.gameId).emit("cell-unlocked", {
      targetId: data.targetId,
      index: data.index,
      shooterId: data.shooterId,
    });
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