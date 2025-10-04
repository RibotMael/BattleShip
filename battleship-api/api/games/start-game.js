import express from "express";
import db from '../../db.js';

const router = express.Router();

function sanitize(param) {
  return param !== undefined ? param : null;
}

// Démarrer une partie
router.post("/:gameId", async (req, res) => { 
  const gameId = sanitize(req.params.gameId);
  const userId = sanitize(req.body.userId);

  if (!gameId) return res.status(400).json({ success: false, message: "ID de partie manquant" });

  try {
    const [games] = await db.execute("SELECT * FROM games WHERE id_Game = ?", [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = games[0];

    if (!userId || Number(userId) !== Number(game.id_creator)) {
      return res.status(403).json({ success: false, message: "Seul le host peut démarrer la partie." });
    }

    // Vérifie que TotalPlayers existe, sinon fallback à 2
    const totalPlayers = game.TotalPlayers ?? 2;

    const [players] = await db.execute("SELECT * FROM game_players WHERE id_game = ?", [gameId]);
    if (players.length < totalPlayers) {
      return res.status(400).json({ 
        success: false, 
        message: `Nombre de joueurs insuffisant (${players.length}/${totalPlayers})` 
      });
    }

    await db.execute("UPDATE games SET status = 'in_progress' WHERE id_Game = ?", [gameId]);

    res.json({ success: true, message: "Partie démarrée !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du démarrage de la partie" });
  }
});

export default router;
