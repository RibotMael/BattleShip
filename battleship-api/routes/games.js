//routes/games.js

import express from "express";
import db from "../db.js";
import { fleetsByVersion } from "../utils/fleets.js";
import { io } from "../index.js";
import { stopGameTimer } from "../index.js";

const router = express.Router();
const games = {};

// Récupérer les parties publiques disponibles
router.get("/public", async (req, res) => {
  try {
    const [games] = await db.query(`
  SELECT 
    g.id_Game,
    g.id_creator,
    g.status,
    g.id_team_mode,
    g.id_version,
    g.id_game_type,         -- ⚠️ ajouter
    u.Pseudo AS CreatorPseudo,
    COUNT(p.id_player) AS CurrentPlayers,
    v.name AS VersionName
    FROM games g
    JOIN mode m ON g.id_game_mode = m.id_Mode
    LEFT JOIN game_players p ON g.id_Game = p.id_game AND p.player_status != 'left'
    LEFT JOIN users u ON g.id_creator = u.ID_Users
    LEFT JOIN version v ON g.id_version = v.id_Version
    WHERE g.status = 'preparation' AND m.name = 'Public'
    GROUP BY g.id_Game
    -- supprimer le HAVING compliqué pour le moment
    ORDER BY g.id_Game DESC
  `);


    const normalizedGames = games.map((g) => {
  // Mode Fr ou Be
  let langKey = "fr";
  const rawLang = (g.VersionName || "fr").toLowerCase();
  if (rawLang.startsWith("fr")) langKey = "fr";
  else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";

  // Mode et nombre de joueurs
  let teamMode = "1v1";
  let totalPlayers = 2;

  if (g.id_game_type === 1) { // Battle Royale
    teamMode = "battle-royale";
    totalPlayers = null; 
  } else { // Team classique
    switch (g.id_team_mode) {
      case 1: teamMode = "1v1"; totalPlayers = 2; break;
      case 2: teamMode = "2v2"; totalPlayers = 4; break;
      case 3: teamMode = "3v3"; totalPlayers = 6; break;
      case 4: teamMode = "4v4"; totalPlayers = 8; break;
      default: teamMode = "1v1"; totalPlayers = 2;
    }
  }

  return {
    ID_Game: g.id_Game,
    CreatorPseudo: g.CreatorPseudo || "Inconnu",
    CurrentPlayers: g.CurrentPlayers,
    TotalPlayers: totalPlayers,
    Status: g.status,
    Language: langKey,
    TeamMode: teamMode,
  };
});



    res.json({ success: true, games: normalizedGames });
  } catch (err) {
    console.error("❌ Erreur /public :", err);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des parties publiques." });
  }
});

//   Créer une partie
router.post("/create", async (req, res) => {
  const { hostId, id_game_mode, id_game_type, id_team_mode, id_version, totalPlayers } = req.body;

  if (!hostId || !id_game_mode || !id_game_type || !id_version) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Calcul du totalPlayers final selon le mode
    let totalPlayersFinal;
    if (id_game_type === 1) {
      totalPlayersFinal = null;
    } else {
      switch (id_team_mode) {
        case 1: totalPlayersFinal = 2; break;
        case 2: totalPlayersFinal = 4; break;
        case 3: totalPlayersFinal = 6; break;
        case 4: totalPlayersFinal = 8; break;
        default: totalPlayersFinal = 2;
      }
    }

    // Créer la partie
    const [result] = await db.execute(
      `INSERT INTO games (id_creator, id_game_mode, id_game_type, id_team_mode, id_version, status)
      VALUES (?, ?, ?, ?, ?, 'preparation')`,
      [hostId, id_game_mode, id_game_type, id_team_mode || null, id_version]
    );
    const gameId = result.insertId;

    // Ajouter l’hôte à game_players
    await db.execute(
      "INSERT INTO game_players (id_game, id_player, player_status) VALUES (?, ?, 'in_game')",
      [gameId, hostId]
    );


    const [versionRows] = await db.execute(
      "SELECT name FROM version WHERE id_Version = ?",
      [id_version]
    );
    const rawLang = versionRows.length ? versionRows[0].name.toLowerCase() : "fr";
    let langKey;
    if (rawLang.startsWith("fr")) langKey = "fr";
    else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";
    else langKey = "fr";

    res.json({
      success: true,
      game: {
        ID_Game: gameId,
        id_creator: hostId,
        id_game_mode,
        id_game_type,
        id_team_mode,
        id_version,
        TotalPlayers: totalPlayersFinal,
        status: "preparation",
        language: rawLang,
      },
      mode: langKey,
    });
  } catch (err) {
    console.error("❌ Erreur création partie :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la création de la partie." });
  }
});

// Rejoindre une partie
router.post("/join", async (req, res) => {
  console.log("📩 Requête reçue sur /join :", req.body);
  const { gameId, playerId } = req.body;
  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [games] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    // Récupérer la langue à partir de la version
    const [versionRows] = await db.execute("SELECT name FROM version WHERE id_Version = ?", [games[0].id_version]);
    const rawLang = versionRows.length ? versionRows[0].name.toLowerCase() : "french";
    let langKey;
    if (rawLang.startsWith("fr")) langKey = "fr";
    else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";
    else langKey = "fr";

    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const [existing] = await db.execute("SELECT * FROM game_players WHERE id_game = ? AND id_player = ?", [gameId, playerId]);
    if (existing.length) return res.status(400).json({ success: false, message: "Joueur déjà dans la partie" });

    await db.execute("INSERT INTO game_players (id_game, id_player) VALUES (?, ?)", [gameId, playerId]);

    const [players] = await db.execute("SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?", [gameId]);
    console.log(`👥 [JOIN GAME] Joueur ${playerId} rejoint la partie ${gameId} (${players[0].count} joueurs présents)`);

    res.json({ success: true, message: "Joueur ajouté à la partie", mode: langKey });

  } catch (err) {
    console.error("❌ Erreur join-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la jointure." });
  }
});

// Récupérer une partie
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [gameRows] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [id]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // Détermination de la langue à partir de l'id_version
    const [versionRows] = await db.execute("SELECT name FROM version WHERE id_Version = ?", [game.id_version]);
    const language = versionRows.length ? versionRows[0].name : "fr";

    // Récupération des joueurs
    const [players] = await db.execute(
    `SELECT 
      gp.id_player AS ID_Users, 
      u.Pseudo, 
      u.Avatar,
      gp.team_number,  
      IFNULL(pb.validated, 0) AS validated
    FROM game_players gp
    JOIN users u ON u.ID_Users = gp.id_player
    LEFT JOIN player_boards pb ON pb.game_id = gp.id_game AND pb.player_id = gp.id_player
    WHERE gp.id_game = ?`,
    [id]
  );


    // Calcul du nombre total de joueurs selon le mode
    let totalPlayers;
    switch (game.id_team_mode) {
      case 1: totalPlayers = 2; break;
      case 2: totalPlayers = 4; break;
      case 3: totalPlayers = 6; break;
      case 4: totalPlayers = 8; break;
      case 5: totalPlayers = null; break;
      default: totalPlayers = 2;
    }


    // Sélection de la flotte correspondante
    const rawLang = language.toLowerCase();
    let langKey;
    if (rawLang.startsWith("fr")) langKey = "fr";
    else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";
    else langKey = "fr";

    const fleet = fleetsByVersion[langKey] || fleetsByVersion.fr;

    res.json({
    success: true,
    game: { 
      ...game, 
      ID_Game: game.id_Game, 
      TotalPlayers: totalPlayers, 
      language 
    },
    players,
    fleet,
    mode: langKey,
  });
  } catch (err) {
    console.error("❌ Erreur get-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post("/kick", async (req, res) => {
  const { gameId, hostId, targetPlayerId } = req.body;

  try {
    // Vérifier que c'est bien l'host qui fait la demande
    const [game] = await db.execute("SELECT id_creator FROM games WHERE id_Game = ?", [gameId]);
    if (!game.length || Number(game[0].id_creator) !== Number(hostId)) {
      return res.status(403).json({ success: false, message: "Action non autorisée" });
    }

    // Supprimer le joueur
    await db.execute("DELETE FROM game_players WHERE id_game = ? AND id_player = ?", [gameId, targetPlayerId]);

    res.json({ success: true, message: "Joueur éjecté" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur lors de l'expulsion" });
  }
});

// équipe
router.post("/assign-team", async (req, res) => {
  const { gameId, playerId, team } = req.body;

  try {
    // On met à jour le team_number
    await db.execute(
      "UPDATE game_players SET team_number = ? WHERE id_game = ? AND id_player = ?",
      [team, gameId, playerId]
    );

    res.json({ success: true, message: "Équipe mise à jour" });
  } catch (err) {
    console.error("Erreur assign-team:", err);
    res.status(500).json({ success: false, message: "Erreur lors de l'assignation" });
  }
});

// Lancer la partie
router.post("/start", async (req, res) => {
  const { gameId, userId } = req.body;
  try {
    const [gameRows] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];
    if (Number(game.id_creator) !== Number(userId))
      return res.status(403).json({ success: false, message: "Non autorisé" });

    const [players] = await db.execute("SELECT * FROM game_players WHERE id_game = ?", [gameId]);

    //   Minimum requis selon mode
    let minPlayers;
    if (game.id_game_type === 1) {
      minPlayers = 2; 
    } else {
      switch (game.id_team_mode) {
        case 1: minPlayers = 2; break;
        case 2: minPlayers = 4; break;
        case 3: minPlayers = 6; break;
        case 4: minPlayers = 8; break;
        default: minPlayers = 2;
      }
    }

    if (players.length < minPlayers) {
      return res.status(400).json({ 
        success: false, 
        message: `Nombre de joueurs insuffisant (${players.length}/${minPlayers})` 
      });
    }

    await db.execute("UPDATE games SET status = 'placement' WHERE id_Game = ?", [gameId]);

    console.log(`🚀 [START GAME] Partie ${gameId} démarrée par l'hôte ${userId}`);
    res.json({ success: true, message: "Partie démarrée !" });
  } catch (err) {
    console.error("❌ Erreur start-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Quitter ou supprimer la partie
router.post("/leave", async (req, res) => {
  const { gameId, playerId } = req.body;
  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [gameRows] = await db.execute(
      "SELECT id_creator, status, id_team_mode FROM games WHERE id_Game = ?",
      [gameId]
    );
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];
    const isHost = Number(game.id_creator) === Number(playerId);

    if (isHost) {
      // L'hôte supprime la partie
      await db.execute("DELETE FROM game_players WHERE id_game = ?", [gameId]);
      await db.execute("DELETE FROM games WHERE id_Game = ?", [gameId]);
      return res.json({ success: true, message: "Partie supprimée par l'hôte" });
    } else {
      // Joueur qui quitte
      const [playerRows] = await db.execute(
        "SELECT * FROM game_players WHERE id_game = ? AND id_player = ?",
        [gameId, playerId]
      );
      if (!playerRows.length) return res.status(404).json({ success: false, message: "Joueur non trouvé dans cette partie" });

      await db.execute("DELETE FROM game_players WHERE id_game = ? AND id_player = ?", [gameId, playerId]);

      // Vérifie si la partie en cours doit repasser en préparation
      if (game.status === 'in_progress') {
        const [stillInGame] = await db.execute("SELECT COUNT(*) as count FROM game_players WHERE id_game = ?", [gameId]);
        let requiredPlayers;
          switch (game.id_team_mode) {
            case 1:
              requiredPlayers = 2;
              break;
            case 2:
              requiredPlayers = 4;
              break;
            case 3:
              requiredPlayers = 6;
              break;
            case 4:
              requiredPlayers = 8;
              break;
            case 5: // Battle Royale
              requiredPlayers = 2; // minimum pour lancer, peut y avoir plus
              break;
            default:
              requiredPlayers = 2;
          }


        if (stillInGame[0].count < requiredPlayers) {
          await db.execute("UPDATE games SET status = 'preparation' WHERE id_Game = ?", [gameId]);
        }
      }

      const [remaining] = await db.execute("SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?", [gameId]);
      return res.json({ success: true, message: "Vous avez quitté la partie", remainingPlayers: remaining[0].count });
    }
  } catch (err) {
    console.error("❌ Erreur leave-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du départ du joueur" });
  }
});

// GET /api/games/:gameId/timer — utilisé par Vue pour se resynchroniser
router.get("/:gameId/timer", async (req, res) => {
  const { gameId } = req.params;
  try {
    const [[game]] = await db.query(
      "SELECT last_turn_timestamp FROM games WHERE id_Game = ?",
      [gameId]
    );
    if (!game) return res.status(404).json({ success: false });

    const elapsed = Math.floor(Date.now() / 1000) - (game.last_turn_timestamp || 0);
    const timeLeft = Math.max(0, Math.min(7, 7 - elapsed));

    res.json({ success: true, timeLeft });
  } catch (err) {
    console.error("❌ Erreur /timer :", err);
    res.status(500).json({ success: false });
  }
});

// Supprimer la partie (seul l’hôte)
router.delete("/delete/:gameId", async (req, res) => {
  const { gameId } = req.params;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [gameRows] = await db.execute("SELECT id_creator FROM games WHERE id_Game = ?", [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];
    if (Number(game.id_creator) !== playerId)
      return res.status(403).json({ success: false, message: "Seul l'hôte peut supprimer la partie" });

    await db.execute("DELETE FROM game_players WHERE id_game = ?", [gameId]);
    await db.execute("DELETE FROM games WHERE id_Game = ?", [gameId]);

    console.log(`✅ [DELETE GAME] Partie ${gameId} supprimée par l'hôte ${playerId}`);
    res.json({ success: true, message: "Partie supprimée avec succès" });
  } catch (err) {
    console.error("❌ Erreur delete-game :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la partie" });
  }
});

// Enregistrer le placement des bateaux
router.post("/place-ships", async (req, res) => {
  console.log("🚀 Route /place-ships appelée", req.body);
  const { gameId, playerId, ships, mode } = req.body;

  if (!gameId || !playerId || !Array.isArray(ships)) {
    return res.status(400).json({ success: false, message: "Paramètres invalides" });
  }

  try {
    const board2D = [];
    for (let y = 0; y < 10; y++) {
      board2D.push(ships.slice(y * 10, (y + 1) * 10));
    }
    const boardJson = JSON.stringify(board2D);

    // Sauvegarde du plateau
    const [existing] = await db.execute(
      "SELECT id FROM player_boards WHERE game_id = ? AND player_id = ?",
      [gameId, playerId]
    );

    if (existing.length) {
      await db.execute(
        "UPDATE player_boards SET board_json = ?, validated = 1 WHERE game_id = ? AND player_id = ?",
        [boardJson, gameId, playerId]
      );
    } else {
      await db.execute(
        "INSERT INTO player_boards (game_id, player_id, board_json, validated) VALUES (?, ?, ?, 1)",
        [gameId, playerId, boardJson]
      );
    }

    // Vérifier si c'est le dernier joueur à valider
    const [readyRows] = await db.execute(
      "SELECT COUNT(DISTINCT player_id) as count FROM player_boards WHERE game_id = ? AND validated = 1",
      [gameId]
    );
    const readyCount = readyRows[0].count;

    const [totalRows] = await db.execute(
      "SELECT COUNT(DISTINCT id_player) as count FROM game_players WHERE id_game = ?",
      [gameId]
    );
    let totalPlayers = totalRows[0].count;
    if (totalPlayers < 2) totalPlayers = 2; // Sécurité

    
    if (readyCount >= totalPlayers) {
      const now = Math.floor(Date.now() / 1000); // Timestamp UNIX comme en PHP
      
      await db.execute(`
        UPDATE games 
        SET status = 'in_progress', current_round = 1, last_turn_timestamp = ? 
        WHERE id_Game = ?
      `, [now, gameId]);
      
      await db.execute(
        "UPDATE game_players SET player_status = 'in_game' WHERE id_game = ?", 
        [gameId]
      );
      
      console.log(`⚔️ [GAME START] La partie ${gameId} est officiellement lancée par Node.js !`);
    }

    res.json({ success: true, message: "Bateaux validés avec succès !" });

  } catch (err) {
    console.error("❌ [PLACE SHIPS ERROR]", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Récupération du plateau du joueur
router.get("/:gameId/board", async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.query;

  if (!gameId || !playerId || playerId === "null" || playerId === "undefined") {
    return res.status(400).json({ success: false, message: "ID de partie ou de joueur invalide." });
  }

  try {
    const [rows] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ? LIMIT 1",
      [gameId, playerId]
    );

    if (rows.length === 0) {
      console.warn(`⚠️ Aucun plateau pour G:${gameId} P:${playerId}`);
      return res.status(404).json({ success: false, message: "Aucun plateau trouvé." });
    }

    let boardData = rows[0].board_json;
    let finalBoard;

    // Sécurité JSON.parse
    try {
      finalBoard = typeof boardData === "string" ? JSON.parse(boardData) : boardData;
    } catch (parseErr) {
      console.error("❌ Erreur format JSON board:", parseErr);
      return res.status(500).json({ success: false, message: "Format de plateau invalide en base." });
    }

    res.json({ success: true, board: finalBoard });
  } catch (err) {
    console.error("❌ Erreur critique récupération plateau :", err);
    res.status(500).json({ success: false, message: "Erreur interne serveur." });
  }
});

router.post("/shoot", async (req, res) => {
  const { gameId, playerId, targetId, x, y } = req.body;
  const sId = String(gameId);

  // Vérification des paramètres
  if (!gameId || !playerId || !targetId || x == null || y == null) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }
  if (x < 0 || x > 9 || y < 0 || y > 9) {
    return res.status(400).json({ success: false, message: "Coordonnées invalides" });
  }

  try {
    const io = req.app.get("io");

    // Initialisation sécurisée
    if (!games[sId]) {
      games[sId] = { turnNumber: 1, finished: false };
    }

    // Partie terminée ?
    if (games[sId].finished) {
      return res.status(400).json({ success: false, message: "Partie terminée" });
    }

    // Vérifie si la case a déjà été tirée
    const [existingShots] = await db.query(
      "SELECT result FROM shots WHERE id_game=? AND target_x=? AND target_y=? AND target_id=? AND id_player=?",
      [gameId, x, y, targetId, playerId]
    );

    if (existingShots.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Case déjà sélectionnée",
        result: existingShots[0].result,
      });
    }

    // Récupération grille ennemie
    const [rows] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id=? AND player_id=?",
      [gameId, targetId]
    );

    const board = rows.length ? JSON.parse(rows[0].board_json) : null;
    if (!board) return res.status(404).json({ success: false, message: "Grille ennemie introuvable" });

    const cellValue = board[y][x];
    let finalResult = cellValue > 0 ? "hit" : "miss";
    let positions = [];
    let gameOver = false;

    // Enregistrement du tir
    await db.query(
      "INSERT INTO shots (id_game, id_player, target_id, target_x, target_y, result, state) VALUES (?, ?, ?, ?, ?, ?, 'resolved')",
      [gameId, playerId, targetId, x, y, finalResult]
    );

    // Vérification si bateau coulé
    if (finalResult === "hit") {
      const targetValue = cellValue;
      board.forEach((row, rowIdx) =>
        row.forEach((cell, colIdx) => {
          if (cell === targetValue && cell > 0) positions.push({ x: colIdx, y: rowIdx });
        })
      );

      if (positions.length > 0) {
        const conditions = positions.map(() => "(target_x=? AND target_y=?)").join(" OR ");
        const values = positions.flatMap((p) => [p.x, p.y]);

        const [hits] = await db.query(
          `SELECT COUNT(*) AS hitCount
           FROM shots
           WHERE id_game=? AND target_id=? AND id_player=? AND result IN ('hit','sunk')
           AND (${conditions})`,
          [gameId, targetId, playerId, ...values]
        );

        if (hits[0].hitCount >= positions.length) {
          await db.query(
            `UPDATE shots
             SET result='sunk'
             WHERE id_game=? AND target_id=? AND id_player=? AND result IN ('hit','sunk')
             AND (${conditions})`,
            [gameId, targetId, playerId, ...values]
          );
          finalResult = "sunk";
        }
      }
    }

    // Vérification fin de partie
    const totalShipCells = board.flat().filter((c) => c > 0).length;
    const [[{ sunkCount }]] = await db.query(
      "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game=? AND target_id=? AND id_player=? AND result='sunk'",
      [gameId, targetId, playerId]
    );

    gameOver = sunkCount >= totalShipCells;

    if (gameOver) {
      await db.query(
        "UPDATE games SET status='finished', winner_id=? WHERE id_game=?",
        [playerId, gameId]
      );
      if (typeof stopGameTimer === "function") stopGameTimer(gameId);
      if (!games[sId]) games[sId] = {};
      games[sId].finished = true;
    }

    // Emission socket : on envoie d'abord le tir
    io?.to(sId).emit("shot-fired", {
      gameId: sId,
      shooterId: playerId,
      targetId,
      x, y,
      result: finalResult,
      positions: finalResult === "sunk" ? positions : [],
      gameOver,
      winnerId: gameOver ? playerId : null,
    });

    // fin de partie
    if (gameOver) {
      setTimeout(() => {
        io?.to(sId).emit("game-over", {
          winnerId: playerId,
          isDraw: false,
          gameId: sId,
        });
      }, 50);
    }

    // Réponse HTTP
    res.json({
      success: true,
      result: finalResult,
      state: "resolved",
      positions: finalResult === "sunk" ? positions : [],
      gameOver,
      ...(gameOver && { winnerId: playerId }),
    });
  } catch (err) {
    console.error("❌ Erreur /shoot :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// GET /api/games/:gameId/shots
router.get("/:gameId/shots", async (req, res) => {
  const { gameId } = req.params;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // On récupère TOUS les tirs de la partie
    const [shots] = await db.query(
      `SELECT id_player, target_id, target_x, target_y, result, state
       FROM shots
       WHERE id_game = ?`,
      [gameId]
    );

    const targetIds = [...new Set(shots.map(s => s.target_id))];
    const boardCache = {};
    await Promise.all(targetIds.map(async (tid) => {
      const [rows] = await db.query(
        "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ?",
        [gameId, tid]
      );
      if (rows.length) boardCache[tid] = JSON.parse(rows[0].board_json);
    }));

    //const board = boardCache[shot.target_id];

    const enhancedShots = await Promise.all(
      shots.map(async (s) => {
        const shot = {
          ...s,
          target_x: Number(s.target_x),
          target_y: Number(s.target_y),
          id_player: Number(s.id_player),
          target_id: Number(s.target_id)
        };

        if (shot.result === "sunk") {
          // ✅ Utiliser le cache ici, plus de requête DB répétée
          const board = boardCache[shot.target_id];
          if (board) {
            const cellValue = board[shot.target_y][shot.target_x];
            const positions = [];
            board.forEach((row, yIdx) =>
              row.forEach((cell, xIdx) => {
                if (cell === cellValue && cell > 0) positions.push({ x: xIdx, y: yIdx });
              })
            );
            shot.positions = positions;
          }
        }
        return shot;
      })
    );

    const incomingShots = enhancedShots.filter(s => s.target_id === playerId);
    const playerShots = enhancedShots.filter(s => s.id_player === playerId);

    res.json({ 
      success: true, 
      incomingShots, 
      playerShots,
      allShots: enhancedShots 
    });
  } catch (err) {
    console.error("❌ Erreur /shots :", err);
    res.status(500).json({ 
      success: false, 
      message: "Erreur serveur",
      incomingShots: [],
      playerShots: []
    });
  }
});

router.get("/:gameId/opponents", async (req, res) => {
  const { gameId } = req.params;
  const playerId = Number(req.query.playerId);
  if (!gameId || !playerId)
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  try {
    const [players] = await db.query(
      `SELECT u.ID_Users as id, u.pseudo, gp.team_number
       FROM users u
       JOIN game_players gp ON u.ID_Users = gp.id_player
       WHERE gp.id_game = ? AND u.ID_Users != ?`,
      [gameId, playerId]
    );
    const [[myPlayer]] = await db.query(
      `SELECT team_number FROM game_players WHERE id_game = ? AND id_player = ?`,
      [gameId, playerId]
    );
    if (!players.length)
      return res.status(404).json({ success: false, message: "Aucun adversaire disponible" });
    res.json({ success: true, opponents: players, myTeamNumber: myPlayer?.team_number ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post("/eliminate-player", async (req, res) => {
  const { gameId, playerId, reason } = req.body;

  if (!gameId || !playerId || !["abandon", "shot"].includes(reason)) {
    return res.status(400).json({ success: false, message: "Paramètres invalides" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const newStatus = reason === "abandon" ? "left" : "dead";
    await conn.query(
      `UPDATE game_players SET player_status = ?
       WHERE id_game = ? AND id_player = ? AND (player_status = 'in_game' OR player_status IS NULL)`,
      [newStatus, gameId, playerId]
    );

    const [players] = await conn.query(
      "SELECT id_player, player_status, team_number FROM game_players WHERE id_game = ?",
      [gameId]
    );

    const alivePlayers = players.filter((p) => p.player_status === "in_game");
    const isTeamMode = players.some((p) => p.team_number !== null);

    let finished = false;
    let winnerId = null;
    let winnerTeam = null;
    let isDraw = false;

    if (isTeamMode) {
      const aliveTeams = [...new Set(alivePlayers.map((p) => p.team_number).filter((t) => t !== null))];

      if (aliveTeams.length === 0) {
        finished = true;
        isDraw = true;
        await conn.query("UPDATE games SET status='finished', winner_id=NULL WHERE id_Game=?", [gameId]);
      } else if (aliveTeams.length === 1) {
        finished = true;
        winnerTeam = aliveTeams[0];
        const winner = alivePlayers.find((p) => p.team_number === winnerTeam);
        winnerId = winner?.id_player ?? null;
        await conn.query("UPDATE games SET status='finished', winner_id=? WHERE id_Game=?", [winnerId, gameId]);
      }
    } else {
      if (alivePlayers.length === 0) {
        finished = true;
        isDraw = true;
        await conn.query("UPDATE games SET status='finished', winner_id=NULL WHERE id_Game=?", [gameId]);
      } else if (alivePlayers.length === 1) {
        finished = true;
        winnerId = alivePlayers[0].id_player;
        await conn.query("UPDATE games SET status='finished', winner_id=? WHERE id_Game=?", [winnerId, gameId]);
      }
    }

    await conn.commit();

    if (finished) {
      if (typeof stopGameTimer === "function") stopGameTimer(gameId);
      io.to(String(gameId)).emit("game-over", { winnerId, winnerTeam, isDraw });
    } else {
      const [[eliminated]] = await conn.query(
        "SELECT team_number FROM game_players WHERE id_game=? AND id_player=?",
        [gameId, playerId]
      );
      io.to(String(gameId)).emit("player-eliminated", {
        playerId,
        reason,
        teamNumber: eliminated?.team_number ?? null,
        aliveCount: alivePlayers.length,
      });
    }

    return res.json({
      success: true,
      finished,
      winner_id: winnerId,
      winner_team: winnerTeam,
      is_draw: isDraw,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Erreur eliminate-player:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  } finally {
    conn.release();
  }
});

// Vérifie si la partie est terminée et qui a gagné
router.get("/:id/status", async (req, res) => {
  const gameId = req.params.id;

  try {
    const [gameRows] = await db.query(
      "SELECT status, winner_id FROM games WHERE id_Game = ?",
      [gameId]
    );

    if (!gameRows.length)
      return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    if (game.status === "finished") {
      stopGameTimer(gameId);

      let winnerTeam = null;
      if (game.winner_id) {
        const [[wp]] = await db.query(
          "SELECT team_number FROM game_players WHERE id_game = ? AND id_player = ?",
          [gameId, game.winner_id]
        );
        winnerTeam = wp?.team_number ?? null;
      }

      io.to(String(gameId)).emit("game-over", {
        winnerId: game.winner_id,
        winnerTeam,
        isDraw: data.winner_id === null && winnerTeam === null,
      });

      return res.json({
        success: true,
        status: "finished",
        winner_id: game.winner_id,
        winner_team: winnerTeam,
      });
    }

    return res.json({ success: true, status: game.status });

  } catch (err) {
    console.error("Erreur /status :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/:id/stats", async (req, res) => {
  const playerId = parseInt(req.params.id);
  if (!playerId) return res.status(400).json({ success: false });
 
  try {
    const [rows] = await db.query(
      "SELECT Gold, xp, niveau FROM users WHERE ID_Users = ?",
      [playerId]
    );
    if (!rows.length) return res.status(404).json({ success: false });
 
    const { Gold, xp } = rows[0];
    const lvl = computeLevel(xp);
 
    return res.json({
      success: true,
      gold:    Gold,
      xp,
      level:   lvl.level,
      xpIntoLevel:     lvl.xpIntoLevel,
      xpNeededForNext: lvl.xpNeededForNext,
    });
  } catch (err) {
    console.error("Erreur /stats :", err);
    return res.status(500).json({ success: false });
  }
});

// POST /api/games/join/:id
router.post("/join/:id", async (req, res) => {
  const gameId = parseInt(req.params.id, 10);   
  const playerId = parseInt(req.body.playerId, 10); 

  if (!playerId || !gameId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Récupérer la partie quel que soit son statut
    const [gameRows] = await db.query(`SELECT * FROM games WHERE id_Game = ?`, [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // Vérifier si le joueur est déjà dans la partie
    const [existingRows] = await db.query(
      `SELECT * FROM game_players WHERE id_player = ? AND id_game = ?`,
      [playerId, gameId]
    );

    if (existingRows.length > 0) {
      // Forcer le statut joueur à in_game si nécessaire
      await db.query(
        `UPDATE game_players SET player_status = 'in_game' WHERE id_player = ? AND id_game = ?`,
        [playerId, gameId]
      );

      return res.json({
        success: true,
        message: "Vous êtes déjà dans la partie",
        game: {
          ID_Game: game.id_Game,
          status: game.status, 
          id_creator: game.id_creator
        }
      });
    }

    // Ajouter le joueur sans toucher au statut de la partie
    await db.query(
      `INSERT INTO game_players (id_game, id_player, player_status) VALUES (?, ?, 'in_game')`,
      [gameId, playerId]
    );

    console.log(`👥 [JOIN GAME] Joueur ${playerId} rejoint la partie ${gameId} (statut=${game.status})`);

    res.json({
      success: true,
      message: "Vous avez rejoint la partie avec succès !",
      game: {
        ID_Game: game.id_Game,
        status: game.status,
        id_creator: game.id_creator
      }
    });
  } catch (err) {
    console.error("❌ Erreur rejoindre partie :", err);
    res.status(500).json({ success: false, message: "Erreur lors de la tentative de rejoindre la partie." });
  }
});

export default router;
