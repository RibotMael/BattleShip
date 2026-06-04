import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import db from './db.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant dans .env — arrêt du serveur.');
  process.exit(1);
}
if (!process.env.INTERNAL_SECRET) {
  console.error('❌ INTERNAL_SECRET manquant dans .env — arrêt du serveur.');
  process.exit(1);
}

// Routes
import authRoutes from './routes/auth.js';
import userProfileRoutes from './routes/user.js';
import checkPseudoRoute from './api/check-pseudo.js';
import avatarRouter from './api/avatar.js';
import friendsRouter from './routes/friends.js';
import invitationsRouter from './routes/invitations.js';
import gamesRouter from './routes/games.js';
import shopRoutes from './routes/shop.js';

const app = express();
const server = http.createServer(app);
const userSocketMap = {};

/* ==========================
   MIDDLEWARE CORS
========================== */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://battle-ship-seven.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      const isLocalhost =
        origin.includes('localhost') || origin.includes('127.0.0.1');
      if (isLocalhost) return callback(null, true);
      return callback(new Error('Accès refusé par CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* ==========================
   HEADERS DE SÉCURITÉ
========================== */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/* ==========================
   BODY PARSING
========================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/* ==========================
   RATE LIMITING GLOBAL
========================== */
const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, ralentissez.' },
  validate: { xForwardedForHeader: false },
});
app.use('/api', globalLimiter);

/* ==========================
   SOCKET.IO CONFIGURATION
========================== */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

/* ==========================
   TIMER SERVEUR (LOGIQUE)
========================== */
const games = {};

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

async function grantRewards(gameId, winnerId, winnerTeam, isDraw) {
  function computeXpProgress(xp) {
    let level = 0, used = 0;
    while (true) {
      const needed = Math.floor(100 * Math.pow(1.02, level));
      if (used + needed > xp) return { level, xpIntoLevel: xp - used, xpNeededForNext: needed };
      used += needed;
      level++;
    }
  }

  try {
    const [players] = await db.query(
      'SELECT id_player, team_number FROM game_players WHERE id_game = ?',
      [gameId]
    );

    for (const player of players) {
      let isVictory;
      if (isDraw) isVictory = false;
      else if (winnerTeam !== null && winnerTeam !== undefined)
        isVictory = player.team_number === winnerTeam;
      else isVictory = player.id_player === winnerId;

      try {
        const baseGold = isVictory ? 100 : 25;
        const xpGain   = isVictory ? 50  : 25;

        const [rows] = await db.query(
          'SELECT Gold, xp FROM users WHERE ID_Users = ?',
          [player.id_player]
        );
        if (!rows.length) continue;

        const { Gold: currentGold, xp: currentXp } = rows[0];
        const lvlBefore    = computeXpProgress(currentXp);
        const newXp        = currentXp + xpGain;
        const lvlAfter     = computeXpProgress(newXp);
        const levelsGained = lvlAfter.level - lvlBefore.level;
        const levelUpGold  = levelsGained * 200;
        const totalGold    = baseGold + levelUpGold;
        const newGold      = currentGold + totalGold;

        await db.query(
          'UPDATE users SET Gold = ?, xp = ?, niveau = ? WHERE ID_Users = ?',
          [newGold, newXp, lvlAfter.level, player.id_player]
        );
        await db.query(
          'INSERT IGNORE INTO ratio (ID_Profil, Win, Defeat, Game_Played) VALUES (?, 0, 0, 0)',
          [player.id_player]
        );
        if (isVictory) {
          await db.query(
            'UPDATE ratio SET Win = Win + 1, Game_Played = Game_Played + 1 WHERE ID_Profil = ?',
            [player.id_player]
          );
        } else {
          await db.query(
            'UPDATE ratio SET Defeat = Defeat + 1, Game_Played = Game_Played + 1 WHERE ID_Profil = ?',
            [player.id_player]
          );
        }

        io.to(`user_${player.id_player}`).emit('reward-granted', {
          success:         true,
          goldGain:        totalGold,
          baseGoldGain:    baseGold,
          levelUpGoldGain: levelUpGold,
          xpGain,
          levelsGained,
          newGold,
          newXp,
          newLevel:        lvlAfter.level,
          xpIntoLevel:     lvlAfter.xpIntoLevel,
          xpNeededForNext: lvlAfter.xpNeededForNext,
          levelUp:         levelsGained > 0,
          levelUpTo:       levelsGained > 0 ? lvlAfter.level : null,
        });
      } catch (err) {
        console.error(`[reward] Joueur ${player.id_player}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[grantRewards]', err.message);
  }
}

async function resolveTurn(gameId) {
  const sId = String(gameId);

  try {
    const [pendingShots] = await db.query(
      "SELECT * FROM shots WHERE id_game = ? AND state = 'pending'",
      [gameId]
    );

    if (!pendingShots.length) return;

    const targetIds = [...new Set(pendingShots.map((s) => Number(s.target_id)))];
    const boardCache = {};
    await Promise.all(
      targetIds.map(async (tid) => {
        const [rows] = await db.query(
          'SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ? LIMIT 1',
          [gameId, tid]
        );
        if (rows.length) boardCache[tid] = JSON.parse(rows[0].board_json);
      })
    );

    for (const shot of pendingShots) {
      const board = boardCache[Number(shot.target_id)];
      if (!board) continue;

      const cellValue = board[shot.target_y][shot.target_x];
      let result = cellValue > 0 ? 'hit' : 'miss';
      let positions = [];

      await db.query(
        "UPDATE shots SET result = ?, state = 'resolved' WHERE id_shot = ?",
        [result, shot.id_shot]
      );

      if (result === 'hit') {
        const shipCells = [];
        for (let y = 0; y < board.length; y++)
          for (let x = 0; x < board[y].length; x++)
            if (board[y][x] === cellValue) shipCells.push({ x, y });

        const conditions = shipCells.map(() => '(target_x=? AND target_y=?)').join(' OR ');
        const values = shipCells.flatMap((p) => [p.x, p.y]);

        const [[{ hitCount }]] = await db.query(
          `SELECT COUNT(*) AS hitCount
           FROM shots
           WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
           AND (${conditions})`,
          [gameId, shot.target_id, ...values]
        );

        if (hitCount >= shipCells.length) {
          result = 'sunk';
          positions = shipCells;
          await db.query(
            `UPDATE shots SET result='sunk'
             WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
             AND (${conditions})`,
            [gameId, shot.target_id, ...values]
          );
        }
      }

      io.to(sId).emit('shot-fired', {
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

    for (const tid of targetIds) {
      const board = boardCache[tid];
      if (!board) continue;

      const totalCells = board.flat().filter((c) => c > 0).length;
      const [[{ sunkCount }]] = await db.query(
        "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game=? AND target_id=? AND result='sunk'",
        [gameId, tid]
      );

      if (totalCells > 0 && sunkCount >= totalCells) {
        const [upd] = await db.query(
          `UPDATE game_players SET player_status='dead'
           WHERE id_game=? AND id_player=? AND player_status='in_game'`,
          [gameId, tid]
        );
        if (upd.affectedRows > 0) {
          io.to(sId).emit('player-eliminated', { playerId: tid, reason: 'shot' });
        }
      }
    }

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
        ...new Set(alivePlayers.map((p) => p.team_number).filter((t) => t !== null)),
      ];
      if (aliveTeams.length <= 1) {
        finished = true;
        isDraw = aliveTeams.length === 0;
        winnerTeam = isDraw ? null : aliveTeams[0];
        winnerId = isDraw
          ? null
          : (alivePlayers.find((p) => p.team_number === winnerTeam)?.id_player ?? null);
      }
    } else {
      if (alivePlayers.length <= 1) {
        finished = true;
        isDraw = alivePlayers.length === 0;
        winnerId = isDraw ? null : alivePlayers[0].id_player;
      }
    }

    if (finished) {
      const [updGame] = await db.query(
        "UPDATE games SET status='finished', winner_id=? WHERE id_Game=? AND status='in_progress'",
        [winnerId, gameId]
      );
      if (updGame.affectedRows > 0) {
        stopGameTimer(gameId);
        await grantRewards(gameId, winnerId, winnerTeam, isDraw);
        io.to(sId).emit('game-over', {
          winnerId,
          winnerTeam,
          isDraw,
          gameId: sId,
        });
      }
    }
  } catch (err) {
    console.error('[resolveTurn]', err.message);
  }
}

function _startTick(sId, duration) {
  if (games[sId]?.timer) clearInterval(games[sId].timer);

  games[sId].timer = setInterval(() => {
    if (!games[sId] || games[sId].finished) {
      clearInterval(games[sId].timer);
      return;
    }

    const elapsed = (Date.now() - games[sId].turnStartAt) / 1000;
    const timeLeft = Math.max(0, Math.ceil(duration - elapsed));

    io.to(sId).emit('turn-timer', {
      timeLeft,
      gameId: sId,
      turnStartAt: games[sId].turnStartAt,
    });

    if (timeLeft <= 0 && !games[sId].ended) {
      games[sId].ended = true;
      clearInterval(games[sId].timer);
      io.to(sId).emit('turn-ended', { reason: 'timeout', gameId: sId });

      setTimeout(async () => {
        if (!games[sId] || games[sId].finished) return;
        await resolveTurn(sId);
        if (games[sId] && !games[sId].finished) startTurn(sId, duration);
      }, 1000);
    }
  }, 1000);
}

async function startTurn(gameId, duration = 7) {
  const sId = String(gameId);

  if (games[sId]?.timer) clearInterval(games[sId].timer);
  if (!games[sId]) games[sId] = { turnNumber: 0 };

  try {
    const [[gameRow]] = await db.query(
      'SELECT status, last_turn_timestamp FROM games WHERE id_Game = ?',
      [sId]
    );

    if (!gameRow || gameRow.status !== 'in_progress') return;

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
        'SELECT last_turn_timestamp FROM games WHERE id_Game = ?',
        [sId]
      );
      if (!freshRow) return;

      games[sId].turnStartAt = (freshRow.last_turn_timestamp || 0) * 1000;
      games[sId].duration = duration;
      games[sId].ended = false;
      games[sId].finished = false;
      games[sId].turnNumber = (games[sId].turnNumber || 0) + 1;

      io.to(sId).emit('turn-timer', {
        timeLeft: duration,
        gameId: sId,
        turnStartAt: games[sId].turnStartAt,
      });

      _startTick(sId, duration);
      return;
    }

    games[sId].turnStartAt = turnStartAt;
    games[sId].duration = duration;
    games[sId].ended = false;
    games[sId].finished = false;
    games[sId].turnNumber = (games[sId].turnNumber || 0) + 1;

    io.to(sId).emit('turn-timer', {
      timeLeft: duration,
      gameId: sId,
      turnStartAt,
    });

    _startTick(sId, duration);
  } catch (err) {
    console.error('[startTurn]', err.message);
  }
}

async function notifyFriendsStatus(userId, isOnline) {
  try {
    const [friends] = await db.query(
      `SELECT u.ID_Users FROM friends f
       JOIN users u
         ON (u.ID_Users = f.Sender_ID AND f.Receiver_ID = ?)
         OR (u.ID_Users = f.Receiver_ID AND f.Sender_ID = ?)
       WHERE f.Status = 'Accepted'`,
      [userId, userId]
    );
    friends.forEach((f) => {
      io.to(`user_${f.ID_Users}`).emit('friend-status-change', {
        userId: Number(userId),
        isOnline,
      });
    });
  } catch {}
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
   LOGIQUE DE TIR SOCKET
========================== */
async function processShot(gameId, playerId, targetId, x, y) {
  if (x < 0 || x > 9 || y < 0 || y > 9) {
    return { success: false, message: 'Coordonnées invalides' };
  }

  const [existingShots] = await db.query(
    `SELECT id_shot, result, state
     FROM shots
     WHERE id_game=? AND target_x=? AND target_y=? AND target_id=? AND id_player=?`,
    [gameId, x, y, targetId, playerId]
  );

  if (existingShots.length > 0) {
    return {
      success: false,
      message: 'Case déjà sélectionnée ou tirée',
      result: existingShots[0].result,
      state: existingShots[0].state,
    };
  }

  await db.query(
    `INSERT INTO shots (id_game, id_player, target_id, target_x, target_y, result, state)
     VALUES (?, ?, ?, ?, ?, NULL, 'pending')`,
    [gameId, playerId, targetId, x, y]
  );

  return { success: true, result: 'pending', state: 'pending', positions: [] };
}

/* ==========================
   ROUTES API
========================== */
app.use('/api', authRoutes);
app.use('/api/users', userProfileRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api', checkPseudoRoute);
app.use('/api/friends', friendsRouter);
app.use('/api/invitation', invitationsRouter);
app.use('/api', avatarRouter);
app.use('/api/games', gamesRouter);

app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API BattleShip ! 🚢');
});

/* ==========================
   SOCKET.IO EVENTS
========================== */
io.on('connection', (socket) => {
  let connectedUserId = null;

  socket.on('join-user-room', ({ userId }) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('register-user', async ({ userId }) => {
    connectedUserId = Number(userId);
    userSocketMap[connectedUserId] = socket.id;
    socket.join(`user_${connectedUserId}`);
    await db.query('UPDATE users SET Online = 1 WHERE ID_Users = ?', [connectedUserId]);
    await notifyFriendsStatus(connectedUserId, true);
  });

  socket.on('disconnect', async () => {
    if (connectedUserId) {
      delete userSocketMap[connectedUserId];
      await db.query('UPDATE users SET Online = 0 WHERE ID_Users = ?', [connectedUserId]);
      await notifyFriendsStatus(connectedUserId, false);
    }
  });

  socket.on('join-game', ({ gameId }) => {
    if (!gameId) return;
    socket.join(String(gameId));

    const sId = String(gameId);
    if (games[sId] && !games[sId].finished && games[sId].turnStartAt) {
      const elapsed = (Date.now() - games[sId].turnStartAt) / 1000;
      const duration = games[sId].duration || 7;
      
      const timeLeft = Math.max(0, Math.ceil(duration - elapsed));

      if (timeLeft >= 0 && !games[sId].ended) {
        socket.emit('turn-timer', {
          timeLeft,
          gameId: sId,
          turnStartAt: games[sId].turnStartAt, 
        });
      }
    }
  });
  socket.on('player-ready', async ({ gameId, playerId }) => {
    const sId = String(gameId);
    try {
      const [players] = await db.query(
        'SELECT player_id FROM player_boards WHERE game_id = ? AND validated = 1',
        [sId]
      );
      const [totalRows] = await db.query(
        'SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?',
        [sId]
      );

      const readyCount = players.length;
      const totalExpected = totalRows[0].count;

      if (readyCount >= totalExpected && totalExpected > 0) {
        if (!games[sId] || !games[sId].timer) {
          io.to(sId).emit('game-started', { timeLeft: 7 });
          startTurn(sId);
        }
      } else {
        io.to(sId).emit('waiting-for-players', {
          ready: readyCount,
          total: totalExpected,
        });
      }
    } catch (err) {
      console.error('[player-ready]', err.message);
    }
  });

  socket.on('shoot', async ({ gameId, playerId, targetId, x, y }) => {
    if (!gameId || !playerId || !targetId || x == null || y == null) {
      return socket.emit('shot-result', { success: false, message: 'Paramètres manquants' });
    }

    try {
      const result = await processShot(gameId, playerId, targetId, x, y);
      socket.emit('shot-result', result);
    } catch (err) {
      console.error('[shoot socket]', err.message);
      socket.emit('shot-result', { success: false, message: 'Erreur serveur' });
    }
  });

  socket.on('lock-cell', (data) => {
    socket.to(data.gameId).emit('cell-pending', {
      targetId: data.targetId,
      index: data.index,
      shooterId: data.shooterId,
    });
  });

  socket.on('unlock-cell', (data) => {
    socket.to(data.gameId).emit('cell-unlocked', {
      targetId: data.targetId,
      index: data.index,
      shooterId: data.shooterId,
    });
  });
});

/* ==========================
   404 & LANCEMENT
========================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable.' });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚢 Backend BattleShip sur le port ${PORT}`);
});

export { io, games, startTurn, stopGameTimer, grantRewards };