// games/start-games.js

import express from "express";
import db from "../../db.js";
import { computeMinPlayers } from "../../utils/gameRules.js";

const router = express.Router();

// Démarrer une partie
router.post("/:gameId", async (req, res) => {
  const gameId = Number(req.params.gameId);
  const userId = Number(req.body.userId);

  if (!gameId) {
    return res.status(400).json({ success: false, message: "ID de partie manquant" });
  }

  try {
    // 🔹 Récupérer la partie + team_size
    const [[game]] = await db.execute(
      `SELECT g.*, tm.team_size
       FROM games g
       LEFT JOIN team_mode tm ON tm.id_Team = g.id_team_mode
       WHERE g.id_Game = ?`,
      [gameId]
    );

    if (!game) {
      return res.status(404).json({ success: false, message: "Partie introuvable" });
    }

    // 🔒 Seul l'hôte peut démarrer
    if (!userId || Number(userId) !== Number(game.id_creator)) {
      return res.status(403).json({
        success: false,
        message: "Seul l'hôte peut démarrer la partie.",
      });
    }

    // 👥 Nombre de joueurs actuellement dans la partie
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) AS count
       FROM game_players
       WHERE id_game = ? AND player_status = 'in_game'`,
      [gameId]
    );

    // 🔢 Minimum requis (logique centralisée)
    const minPlayers = computeMinPlayers(game, game.team_size);

    if (count < minPlayers) {
      return res.status(400).json({
        success: false,
        message: `Nombre de joueurs insuffisant (${count}/${minPlayers})`,
      });
    }

    // 🚀 Lancer la phase de placement
    await db.execute(
      `UPDATE games SET status = 'placement' WHERE id_Game = ?`,
      [gameId]
    );

    res.json({ success: true, message: "Partie démarrée !" });
  } catch (err) {
    console.error("❌ start-games", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors du démarrage de la partie",
    });
  }
});

export default router;
