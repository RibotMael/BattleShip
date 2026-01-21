//routes/games.js

import express from "express";
import db from "../db.js";
import { fleetsByVersion } from "../utils/fleets.js";
import { io } from "../index.js";

const router = express.Router();

// 🔹 Récupérer les parties publiques disponibles
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
  // Langue
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

// 🔹 Créer une partie
router.post("/create", async (req, res) => {
  const { hostId, id_game_mode, id_game_type, id_team_mode, id_version, totalPlayers } = req.body;

  if (!hostId || !id_game_mode || !id_game_type || !id_version) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // 🔹 Calcul du totalPlayers final selon le mode
    let totalPlayersFinal;
    if (id_game_type === 1) {
      // Battle Royale ou type 1 → flexible, min 2
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

    // 🔹 Créer la partie
    const [result] = await db.execute(
      `INSERT INTO games (id_creator, id_game_mode, id_game_type, id_team_mode, id_version, status)
      VALUES (?, ?, ?, ?, ?, 'preparation')`,
      [hostId, id_game_mode, id_game_type, id_team_mode || null, id_version]
    );
    const gameId = result.insertId;

    // 🔹 Ajouter l’hôte à game_players avec player_status correct
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

// 🔹 Rejoindre une partie
router.post("/join", async (req, res) => {
  const { gameId, playerId } = req.body;
  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [games] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    // 🔍 Récupérer la langue à partir de la version
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

// 🔹 Récupérer une partie
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
      `SELECT gp.id_player AS ID_Users, u.Pseudo, u.Avatar,
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
      case 5: totalPlayers = null; break; // Battle Royale → nombre illimité
      default: totalPlayers = 2;
    }


    // Sélection de la flotte correspondante
    const rawLang = language.toLowerCase();
    let langKey;
    if (rawLang.startsWith("fr")) langKey = "fr";
    else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";
    else langKey = "fr";

    const fleet = fleetsByVersion[langKey] || fleetsByVersion.fr;
    //console.log(`🌍 [GET GAME] Version SQL="${language}" → clé="${langKey}" → ${fleet.length} bateaux`);


    res.json({
      success: true,
      game: { ...game, TotalPlayers: totalPlayers, language },
      players,
      fleet,
      mode: langKey,
    });
  } catch (err) {
    console.error("❌ Erreur get-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// 🔹 Lancer la partie
router.post("/start", async (req, res) => {
  const { gameId, userId } = req.body;
  try {
    const [gameRows] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];
    if (Number(game.id_creator) !== Number(userId))
      return res.status(403).json({ success: false, message: "Non autorisé" });

    const [players] = await db.execute("SELECT * FROM game_players WHERE id_game = ?", [gameId]);

    // 🔹 Minimum requis selon mode
    let minPlayers;
    if (game.id_game_type === 1) {
      minPlayers = 2; // Battle Royale
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

// 🔹 Quitter ou supprimer la partie
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

// 🔹 Supprimer la partie (seul l’hôte)
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

// 🔹 Enregistrer le placement des bateaux
router.post("/place-ships", async (req, res) => {
  console.log("🚀 Route /place-ships appelée", req.body);
  const { gameId, playerId, ships, mode } = req.body;

  if (!gameId || !playerId || !Array.isArray(ships)) {
    return res.status(400).json({ success: false, message: "Paramètres manquants ou invalides" });
  }

  try {
    // ✅ On reformate la grille 1D (100 cases) en 10x10
    const board2D = [];
    for (let y = 0; y < 10; y++) {
      board2D.push(ships.slice(y * 10, (y + 1) * 10));
    }

    // ✅ Conversion en JSON
    const boardJson = JSON.stringify(board2D);

    // ✅ On enregistre ou met à jour l’entrée pour ce joueur et cette partie
    const [existing] = await db.execute(
      "SELECT id FROM player_boards WHERE game_id = ? AND player_id = ?",
      [gameId, playerId]
    );

    if (existing.length) {
      // Mise à jour si déjà existant
      await db.execute(
        "UPDATE player_boards SET board_json = ?, validated = 1 WHERE game_id = ? AND player_id = ?",
        [boardJson, gameId, playerId]
      );
      console.log(`♻️ [UPDATE BOARD] game=${gameId}, player=${playerId}`);
    } else {
      // Insertion sinon
      await db.execute(
        "INSERT INTO player_boards (game_id, player_id, board_json, validated) VALUES (?, ?, ?, 1)",
        [gameId, playerId, boardJson]
      );
      console.log(`💾 [SAVE BOARD] game=${gameId}, player=${playerId}`);
    }

  } catch (err) {
    console.error("❌ [PLACE SHIPS ERROR]", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'enregistrement." });
  }
});

// Récupération du plateau du joueur
router.get("/:gameId/board", async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.query;

  try {
    const [rows] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ? LIMIT 1",
      [gameId, playerId]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "Aucun plateau trouvé pour ce joueur." });
    }

    const board = JSON.parse(rows[0].board_json);
    res.json({ success: true, board });
  } catch (err) {
    console.error("❌ Erreur récupération du plateau :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du chargement du plateau." });
  }
});

router.post("/shoot", async (req, res) => {
  const { gameId, playerId, targetId, x, y } = req.body;

  if (!gameId || !playerId || !targetId || x == null || y == null) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  let gameOver = false; // ✅ déclaration ici
  let finalResult;
  let positions;

  try {
    // 1️⃣ Vérifier si la case est déjà sélectionnée par ce joueur
    const [existingShots] = await db.query(
      "SELECT result, state FROM shots WHERE id_game=? AND target_x=? AND target_y=? AND target_id=? AND id_player=?",
      [gameId, x, y, targetId, playerId]
    );

    if (existingShots.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Case déjà sélectionnée", 
        result: existingShots[0].result,
        state: existingShots[0].state
      });
    }

    // 2️⃣ Récupérer la grille du joueur ciblé
    const [rows] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id=? AND player_id=?",
      [gameId, targetId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Grille ennemie introuvable" });

    const board = JSON.parse(rows[0].board_json);
    const cellValue = board[y][x];
    finalResult = cellValue && cellValue > 0 ? "hit" : "miss";

    // 3️⃣ Insérer le tir
    await db.query(
      "INSERT INTO shots (id_game, id_player, target_id, target_x, target_y, result, state) VALUES (?, ?, ?, ?, ?, ?, 'resolved')",
      [gameId, playerId, targetId, x, y, finalResult]
    );

    // 4️⃣ Vérifier si le bateau est coulé
    if (finalResult === "hit") {
      const targetValue = board[y][x];
      positions = [];
      board.forEach((row, rowIdx) =>
        row.forEach((cell, colIdx) => {
          if (cell === targetValue && cell > 0) positions.push({ x: colIdx, y: rowIdx });
        })
      );

      const [hits] = await db.query(
        `SELECT COUNT(*) AS hitCount FROM shots
         WHERE id_game=? AND target_id=? AND id_player=? AND result IN ('hit','sunk')
         AND (${positions.map(p => `(target_x=${p.x} AND target_y=${p.y})`).join(" OR ")})`,
        [gameId, targetId, playerId]
      );

      if (hits[0].hitCount >= positions.length) {
        await db.query(
          `UPDATE shots SET result='sunk'
           WHERE id_game=? AND target_id=? AND id_player=? AND result IN ('hit','sunk')
           AND (${positions.map(p => `(target_x=${p.x} AND target_y=${p.y})`).join(" OR ")})`,
          [gameId, targetId, playerId]
        );
        finalResult = "sunk";
      }
    }

    // 5️⃣ Vérifier si tous les bateaux du joueur ciblé sont coulés
    const totalShipCells = board.flat().filter(c => typeof c === "number" && c > 0).length;
    const [[{ sunkCount }]] = await db.query(
      "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game=? AND target_id=? AND id_player=? AND result='sunk'",
      [gameId, targetId, playerId]
    );

    gameOver = sunkCount >= totalShipCells; // ✅ mise à jour ici

    if (gameOver) {
      await db.query("UPDATE games SET status='finished', winner_id=? WHERE id_Game=?", [playerId, gameId]);
      io.to(gameId).emit("game-over", { winnerId: playerId });
    }

    // 6️⃣ Émettre le tir
    io.to(gameId).emit("shot-fired", {
      shooterId: playerId,
      targetId,
      x,
      y,
      result: finalResult,
      positions: finalResult === "sunk" ? positions : undefined,
    });

    res.json({ 
      success: true, 
      result: finalResult,
      state: 'resolved',
      gameOver, 
      ...(gameOver && { winner_id: playerId })
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
    // 1️⃣ Récupérer tous les tirs pour ce jeu
    const [shots] = await db.query(
      `SELECT id_player, target_id, target_x AS x, target_y AS y, result, state
       FROM shots
       WHERE id_game = ?`,
      [gameId]
    );

    // 2️⃣ Pour les tirs "sunk", reconstruire les positions depuis la grille
    const enhancedShots = await Promise.all(
      shots.map(async (s) => {
        if (s.result === "sunk") {
          const targetPlayerId = s.target_id; // utiliser target_id direct
          const [rows] = await db.query(
            "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ?",
            [gameId, targetPlayerId]
          );

          if (!rows.length) return s;

          const board = JSON.parse(rows[0].board_json);
          const cellValue = board[s.y][s.x]; // valeur du bateau touché
          const positions = [];
          board.forEach((row, yIdx) =>
            row.forEach((cell, xIdx) => {
              if (cell === cellValue && cell > 0) positions.push({ x: xIdx, y: yIdx });
            })
          );

          return { ...s, positions };
        }


        return s;
      })
    );

    // 3️⃣ Retourner tous les tirs
    res.json({ success: true, shots: enhancedShots });

  } catch (err) {
    console.error("❌ Erreur /shots :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});


router.get("/:gameId/opponents", async (req, res) => {
  const { gameId } = req.params;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) 
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [players] = await db.query(
      `SELECT u.ID_Users as id, u.pseudo
        FROM users u
        JOIN game_players gp ON u.ID_Users = gp.id_player
        WHERE gp.id_game = ? AND u.ID_Users != ? AND gp.player_status != 'dead'
        `,
      [gameId, playerId]
    );

    if (!players.length) 
      return res.status(404).json({ success: false, message: "Aucun adversaire disponible" });

    res.json({ success: true, opponents: players });
  } catch (err) {
    console.error("Erreur fetchOpponents :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post("/eliminate-player", async (req, res) => {
  const { gameId, playerId, reason } = req.body; // reason = 'abandon' ou 'shot'

  if (!gameId || !playerId || !["abandon", "shot"].includes(reason)) {
    return res.status(400).json({ success: false, message: "Paramètres invalides" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Mettre à jour le statut du joueur
    const newStatus = reason === "abandon" ? "left" : "dead";
    // Mettre à jour le statut du joueur
    const [update] = await conn.query(
      `UPDATE game_players
      SET player_status = ?
      WHERE id_game = ? AND id_player = ? AND (player_status = 'in_game' OR player_status IS NULL)`,
      [newStatus, gameId, playerId]
    );


    if (update.affectedRows === 0) {
      await conn.rollback();
      return res.json({ success: false, message: "Joueur déjà éliminé ou quitté" });
    }

    // 2️⃣ Récupérer type de partie et joueurs restants
    const [[game]] = await conn.query(`
      SELECT t.name AS game_type
      FROM games g
      JOIN type t ON t.id_Type = g.id_game_type
      WHERE g.id_Game = ?`, [gameId]);

    const [players] = await conn.query(
      `SELECT id_player, player_status FROM game_players WHERE id_game = ?`, [gameId]
    );

    const alivePlayers = players.filter(p => p.player_status === "in_game");

    // 3️⃣ Vérifier si la partie est terminée
    let finished = false;
    let winnerId = null;

    if (alivePlayers.length === 1) {
      finished = true;
      winnerId = alivePlayers[0].id_player;
      await conn.query(
        `UPDATE games SET status = 'finished', winner_id = ? WHERE id_Game = ?`,
        [winnerId, gameId]
      );
    }

    await conn.commit();

    // 4️⃣ Envoyer événements Socket.io
    if (finished) {
      io.to(gameId).emit("game-over", {
        winnerId,
        reason: winnerId === playerId ? "auto-win" : "last_alive"
      });
    } else {
      io.to(gameId).emit("player-eliminated", {
        playerId,
        reason,
        aliveCount: alivePlayers.length,
      });
    }

    return res.json({
      success: true,
      finished,
      winner_id: winnerId,
      message: reason === "abandon"
        ? "💀 Joueur a abandonné"
        : "💀 Joueur éliminé"
    });

  } catch (err) {
    await conn.rollback();
    console.error("Erreur eliminate-player:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  } finally {
    conn.release();
  }
});


// 📍 Vérifie si la partie est terminée et qui a gagné
router.get("/:id/status", async (req, res) => {
  const gameId = req.params.id;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) 
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    // Récupérer le jeu
    const [gameRows] = await db.query(
      "SELECT status, winner_id, id_game_mode FROM games WHERE id_Game = ?",
      [gameId]
    );

    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // 🔹 Mapper id_game_mode en string
    let mode = "1v1"; // valeur par défaut
    if (game.id_game_mode === 2) mode = "battle_royale"; // adapte selon ton id_mode Battle Royale
    game.mode = mode;


    // --- 1. Partie terminée côté serveur ---
    if (game.status === "finished") {
      const winner = game.winner_id;
      let resultType = "draw";

      if (winner === playerId) resultType = "win";
      else if (winner && winner !== playerId) resultType = "lose";

      return res.json({
        success: true,
        finished: true,
        winner,
        result: resultType,
        message: winner === null
          ? "⚔ Égalité !"
          : winner === playerId
            ? "🏆 Victoire !"
            : "💥 Défaite !"
      });
    }

    // --- 2. Partie en cours ---
    if (game.mode === "battle_royale") {
      // Récupérer tous les joueurs de la partie
      const [players] = await db.query(
        "SELECT id_User, eliminated FROM game_players WHERE id_Game = ?",
        [gameId]
      );

      const alivePlayers = players.filter(p => p.eliminated === 0);

      // Vérifier si il reste un seul joueur
      if (alivePlayers.length === 1) {
        const winnerId = alivePlayers[0].id_User;

        // Mettre à jour la table games
        await db.query(
          "UPDATE games SET status = 'finished', winner_id = ? WHERE id_Game = ?",
          [winnerId, gameId]
        );

        return res.json({
          success: true,
          finished: true,
          winner: winnerId,
          result: winnerId === playerId ? "win" : "lose",
          message: winnerId === playerId ? "🏆 Victoire !" : "💥 Défaite !"
        });
      }

      // Toujours en cours
      return res.json({ success: true, finished: false });
    }

    // --- 3. Partie classique 1v1 ---
    // Si mode 1v1 et status != finished, alors partie en cours
    return res.json({ success: true, finished: false });

  } catch (err) {
    console.error("Erreur /status :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
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
    // 🔹 Récupérer la partie quel que soit son statut
    const [gameRows] = await db.query(`SELECT * FROM games WHERE id_Game = ?`, [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // 🔹 Vérifier si le joueur est déjà dans la partie
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
          status: game.status, // 🔹 garder le statut existant
          id_creator: game.id_creator
        }
      });
    }

    // 🔹 Ajouter le joueur sans toucher au statut de la partie
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
        status: game.status, // 🔹 reste in_progress ou preparation
        id_creator: game.id_creator
      }
    });
  } catch (err) {
    console.error("❌ Erreur rejoindre partie :", err);
    res.status(500).json({ success: false, message: "Erreur lors de la tentative de rejoindre la partie." });
  }
});

export default router;
