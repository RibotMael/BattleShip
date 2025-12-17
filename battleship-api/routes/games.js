//routes/games.js

import express from "express";
import db from "../db.js";
import { fleetsByVersion } from "../utils/fleets.js";

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
        u.Pseudo AS CreatorPseudo,
        COUNT(p.id_player) AS CurrentPlayers,
        v.name AS VersionName
      FROM games g
      JOIN mode m ON g.id_game_mode = m.id_Mode
      LEFT JOIN game_players p ON g.id_Game = p.id_game AND p.player_status != 'left'
      LEFT JOIN users u ON g.id_creator = u.ID_Users
      LEFT JOIN version v ON g.id_version = v.id_Version
      WHERE 
        g.status = 'preparation'
        AND m.name = 'Public'
      GROUP BY g.id_Game
      HAVING CurrentPlayers < 
        CASE g.id_team_mode 
          WHEN 1 THEN 2 
          WHEN 2 THEN 4 
          WHEN 3 THEN 8 
          WHEN 4 THEN 20 
          ELSE 2 
        END
      ORDER BY g.id_Game DESC
    `);

    const normalizedGames = games.map((g) => {
      let langKey = "fr";
      const rawLang = (g.VersionName || "fr").toLowerCase();
      if (rawLang.startsWith("fr")) langKey = "fr";
      else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";

      let teamMode = "1v1";
      let totalPlayers = 2;

      switch (g.id_team_mode) {
        case 2: teamMode = "2v2"; totalPlayers = 4; break;
        case 3: teamMode = "4v4"; totalPlayers = 8; break;
        case 4: teamMode = "battle-royale"; totalPlayers = 20; break;
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
    let computedTotal;
    switch (id_team_mode) {
      case 1: computedTotal = 2; break;
      case 2: computedTotal = 4; break;
      case 3: computedTotal = 8; break;
      case 4: computedTotal = 20; break;
      default: computedTotal = 2;
    }

    const totalPlayersFinal = Number(totalPlayers) || computedTotal;
    console.log(`🎮 [CREATE GAME] hostId=${hostId}, id_team_mode=${id_team_mode}, totalPlayers=${totalPlayersFinal}`);

    const [result] = await db.execute(
      `INSERT INTO games (id_creator, id_game_mode, id_game_type, id_team_mode, id_version, status)
       VALUES (?, ?, ?, ?, ?, 'preparation')`,
      [hostId, id_game_mode, id_game_type, id_team_mode || null, id_version]
    );
    const gameId = result.insertId;

    await db.execute("INSERT INTO game_players (id_game, id_player) VALUES (?, ?)", [gameId, hostId]);

    const [versionRows] = await db.execute(
      "SELECT name FROM version WHERE id_Version = ?",
      [id_version]
    );

    const rawLang = versionRows.length ? versionRows[0].name.toLowerCase() : "french";

    // Normalisation
    let langKey;
    if (rawLang.startsWith("fr")) langKey = "fr";
    else if (rawLang.startsWith("bel") || rawLang === "be" || rawLang === "belgium") langKey = "be";
    else langKey = "fr";

    console.log(`🌍 [VERSION] SQL="${rawLang}" → clé="${langKey}"`);


    const fleet = fleetsByVersion[langKey];


    console.log(`✅ [CREATE GAME] Partie ${gameId} créée (${totalPlayersFinal} joueurs attendus)`);
    console.log(`🌍 Version trouvée = ${rawLang}, Clé utilisée = ${langKey}`);

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
      case 3: totalPlayers = 8; break;
      case 4: totalPlayers = 20; break;
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
    // ⚠️ Utiliser les bons noms de colonnes
    const [gameRows] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    if (Number(game.id_creator) !== Number(userId))
      return res.status(403).json({ success: false, message: "Non autorisé" });

    // On met à jour le statut
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
        const requiredPlayers = game.id_team_mode === 1 ? 2 :
          game.id_team_mode === 2 ? 4 :
            game.id_team_mode === 3 ? 8 :
              game.id_team_mode === 4 ? 20 : 2;

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

// POST /api/games/shoot
router.post("/shoot", async (req, res) => {
  const { gameId, playerId, targetId, x, y } = req.body;

  if (!gameId || !playerId || !targetId || x == null || y == null) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // 1️⃣ Vérifier si le tir existe déjà
    const [existingShots] = await db.query(
      "SELECT result FROM shots WHERE id_game=? AND id_player=? AND target_x=? AND target_y=?",
      [gameId, playerId, x, y]
    );
    if (existingShots.length > 0) {
      return res.json({ success: true, result: existingShots[0].result, gameOver: false });
    }

    // 2️⃣ Récupérer la grille de l’adversaire
    const [rows] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id=? AND player_id=?",
      [gameId, targetId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Grille ennemie introuvable" });

    const board = JSON.parse(rows[0].board_json);
    const shipNumber = board[y][x];
    let result = shipNumber && typeof shipNumber === "number" && shipNumber > 0 ? "hit" : "miss";

    // 3️⃣ Enregistrer le tir
    await db.query(
      "INSERT INTO shots (id_game, id_player, target_id, target_x, target_y, result) VALUES (?, ?, ?, ?, ?, ?)",
      [gameId, playerId, targetId, x, y, result]
    );

    if (result === "hit") {
      // 4️⃣ Vérifier si le bateau est coulé
      const positions = [];
      board.forEach((rowArr, rowIdx) =>
        rowArr.forEach((cell, colIdx) => {
          if (cell === shipNumber) positions.push({ x: colIdx, y: rowIdx });
        })
      );

      const [hits] = await db.query(
        `SELECT COUNT(*) AS hitCount FROM shots
         WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
         AND (${positions.map(p => `(target_x=${p.x} AND target_y=${p.y})`).join(" OR ")})`,
        [gameId, targetId]
      );

      if (hits[0].hitCount >= positions.length) {
        // bateau coulé → update uniquement dans shots
        await db.query(
          `UPDATE shots SET result='sunk'
           WHERE id_game=? AND target_id=? AND result IN ('hit','sunk')
           AND (${positions.map(p => `(target_x=${p.x} AND target_y=${p.y})`).join(" OR ")})`,
          [gameId, targetId]
        );
        result = "sunk";
      }
    }

    // 5️⃣ Vérifier si tous les bateaux ennemis sont coulés
    const totalShipCells = board.flat().filter(c => typeof c === "number" && c > 0).length;
    const [[{ sunkCount }]] = await db.query(
      "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game=? AND target_id=? AND result='sunk'",
      [gameId, targetId]
    );
    const gameOver = sunkCount >= totalShipCells;

    if (gameOver) {
      await db.query("UPDATE games SET status='finished', winner_id=? WHERE id_Game=?", [playerId, gameId]);
    }

    res.json({ success: true, result, gameOver });

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
    // Récupérer tous les tirs pour ce joueur
    const [shots] = await db.query(
      "SELECT id_player, target_x AS x, target_y AS y, result FROM shots WHERE id_game = ?",
      [gameId]
    );

    // Pour les bateaux coulés, récupérer toutes les positions
    const enhancedShots = await Promise.all(
      shots.map(async (s) => {
        if (s.result === "sunk" && s.ship_number) {
          const [rows] = await db.query(
            "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ?",
            [gameId, s.id_player === playerId ? s.target_id : s.id_player]
          );
          const board = JSON.parse(rows[0].board_json);
          const positions = [];
          board.forEach((row, y) =>
            row.forEach((cell, x) => {
              if (cell === s.ship_number) positions.push({ x, y });
            })
          );
          return { ...s, positions };
        }
        return s;
      })
    );

    res.json({ success: true, shots: enhancedShots });
  } catch (err) {
    console.error("Erreur /shots :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get("/:gameId/opponent", async (req, res) => {
  const { gameId } = req.params;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [players] = await db.query(
      "SELECT id_player FROM game_players WHERE id_game = ? AND id_player != ?",
      [gameId, playerId]
    );

    if (!players.length) return res.status(404).json({ success: false, message: "Adversaire introuvable" });

    res.json({ success: true, opponentId: players[0].id_player });
  } catch (err) {
    console.error("Erreur fetchOpponent :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// POST /api/games/abandon
router.post("/abandon", async (req, res) => {
  const { gameId, playerId, targetId } = req.body;

  try {
    // Le joueur adverse gagne automatiquement
    await db.query(
      "UPDATE games SET status = 'finished', winner_id = ? WHERE id_Game = ?",
      [targetId, gameId]
    );

    res.json({ success: true, message: "Partie abandonnée" });

  } catch (err) {
    console.error("Erreur /abandon :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// 📍 Vérifie si la partie est terminée et qui a gagné
router.get("/:id/status", async (req, res) => {
  const gameId = req.params.id;
  const playerId = Number(req.query.playerId);

  if (!gameId || !playerId) 
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    // Récupérer le statut du jeu
    const [gameRows] = await db.query(
      "SELECT status FROM games WHERE id_Game = ?",
      [gameId]
    );
    if (gameRows.length === 0) 
      return res.status(404).json({ success: false, message: "Partie introuvable" });

    // Si la partie n'est pas finie
    if (gameRows[0].status !== "finished") {
      return res.json({ success: true, finished: false });
    }

    // Récupérer les joueurs
    const [players] = await db.query(
      "SELECT id_player FROM game_players WHERE id_game = ?",
      [gameId]
    );
    if (players.length !== 2) 
      return res.json({ success: true, finished: true, result: "draw", message: "Partie terminée — aucun gagnant défini" });

    const [playerA, playerB] = [players[0].id_player, players[1].id_player];

    // Récupérer le nombre total de cases de bateaux pour chaque joueur
    const [boardA] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ?",
      [gameId, playerA]
    );
    const [boardB] = await db.query(
      "SELECT board_json FROM player_boards WHERE game_id = ? AND player_id = ?",
      [gameId, playerB]
    );

    const totalCasesA = JSON.parse(boardA[0].board_json).flat().filter(c => typeof c === 'number' && c > 0).length;
    const totalCasesB = JSON.parse(boardB[0].board_json).flat().filter(c => typeof c === 'number' && c > 0).length;

    // Compter les cases "sunk" dans la table shots
    const [[{ sunkCount: sunkA }]] = await db.query(
      "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game = ? AND target_id = ? AND result = 'sunk'",
      [gameId, playerA]
    );
    const [[{ sunkCount: sunkB }]] = await db.query(
      "SELECT COUNT(*) AS sunkCount FROM shots WHERE id_game = ? AND target_id = ? AND result = 'sunk'",
      [gameId, playerB]
    );

    const allSunkA = sunkA >= totalCasesA;
    const allSunkB = sunkB >= totalCasesB;

    // Déterminer le gagnant
    let winner = null;
    if (allSunkA && allSunkB) winner = null;      // égalité
    else if (allSunkA) winner = playerB;
    else if (allSunkB) winner = playerA;

    let resultType = "draw";
    if (winner === playerId) resultType = "win";
    else if (winner && winner !== playerId) resultType = "lose";

    res.json({
      success: true,
      finished: true,
      winner,
      result: resultType,
      message: winner === null ? "⚔ Égalité !" : `🏆 Victoire pour ${winner === playerId ? "vous" : "l'adversaire"}`
    });

  } catch (err) {
    console.error("Erreur /status :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// POST /api/games/join/:id
router.post("/join/:id", async (req, res) => {
  const gameId = parseInt(req.params.id, 10);   // 🔹 Force INT
  const playerId = parseInt(req.body.playerId, 10); // 🔹 Force INT

  if (!playerId || !gameId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    const [gameRows] = await db.query(
      `SELECT * FROM games WHERE id_Game = ? AND status = 'preparation'`,
      [gameId]
    );

    const game = gameRows[0];
    if (!game) {
      return res.status(404).json({ success: false, message: "Partie introuvable ou déjà commencée." });
    }

    const [existingRows] = await db.query(
      `SELECT * FROM game_players WHERE id_player = ? AND id_game = ?`,
      [playerId, gameId]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({ success: false, message: "Vous êtes déjà dans cette partie." });
    }

    await db.query(
      `INSERT INTO game_players (id_game, id_player, player_status) VALUES (?, ?, 'in_game')`,
      [gameId, playerId]
    );

    console.log(`👥 [JOIN GAME] Joueur ${playerId} rejoint la partie ${gameId}`);
    res.json({ success: true, message: "Vous avez rejoint la partie avec succès !" });
  } catch (err) {
    console.error("❌ Erreur rejoindre partie :", err);
    res.status(500).json({ success: false, message: "Erreur lors de la tentative de rejoindre la partie." });
  }
});

export default router;
