//games.js

import express from "express";
import db from "../db.js";

const router = express.Router();

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

    const [versionRows] = await db.execute("SELECT name FROM version WHERE id_Version = ?", [id_version]);
    const language = versionRows.length ? versionRows[0].name : "fr";

    console.log(`✅ [CREATE GAME] Partie ${gameId} créée (${totalPlayersFinal} joueurs attendus)`);

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
        language,
      },
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
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const [existing] = await db.execute("SELECT * FROM game_players WHERE id_game = ? AND id_player = ?", [gameId, playerId]);
    if (existing.length) return res.status(400).json({ success: false, message: "Joueur déjà dans la partie" });

    await db.execute("INSERT INTO game_players (id_game, id_player) VALUES (?, ?)", [gameId, playerId]);

    const [players] = await db.execute("SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?", [gameId]);
    console.log(`👥 [JOIN GAME] Joueur ${playerId} rejoint la partie ${gameId} (${players[0].count} joueurs présents)`);

    res.json({ success: true, message: "Joueur ajouté à la partie" });
  } catch (err) {
    console.error("❌ Erreur join-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la jointure." });
  }
});

// 🔹 Récupérer une partie
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [gameRows] = await db.execute("SELECT * FROM games WHERE ID_Game = ?", [id]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    let computedTotal;
    switch (game.id_team_mode) {
      case 1: computedTotal = 2; break;
      case 2: computedTotal = 4; break;
      case 3: computedTotal = 8; break;
      case 4: computedTotal = 20; break;
      default: computedTotal = 2;
    }

    const TotalPlayers = computedTotal;

    const [players] = await db.execute(
      `SELECT gp.ID_Player AS ID_Users, u.Pseudo, u.Avatar
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.ID_Player
       WHERE gp.ID_Game = ?`,
      [id]
    );

    res.json({ success: true, game: { ...game, TotalPlayers }, players });
  } catch (err) {
    console.error("❌ Erreur get-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// 🔹 Lancer la partie
router.post("/start", async (req, res) => {
  const { gameId, userId } = req.body;
  try {
    const [gameRows] = await db.execute("SELECT * FROM games WHERE ID_Game = ?", [gameId]);
    if (!gameRows.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    if (Number(gameRows[0].ID_Creator) !== Number(userId))
      return res.status(403).json({ success: false, message: "Non autorisé" });

    await db.execute("UPDATE games SET Status = 'started' WHERE ID_Game = ?", [gameId]);
    res.json({ success: true });
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

export default router;
