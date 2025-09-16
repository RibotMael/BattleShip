// battleship-api/api/games/start-game.js
import express from "express";
import db from '../../db.js';

const router = express.Router();

function sanitize(param) {
  return param !== undefined ? param : null;
}

// Démarrer une partie
router.post("/start/:gameId", async (req, res) => {
  const gameId = sanitize(req.params.gameId);
  const userId = sanitize(req.body.userId);

  if (!gameId) return res.status(400).json({ success: false, message: "ID de partie manquant" });

  try {
    const [games] = await db.execute("SELECT * FROM game WHERE ID_Game = ?", [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = games[0];

    if (userId && Number(userId) !== Number(game.Host_ID)) {
      return res.status(403).json({ success: false, message: "Seul le host peut démarrer la partie." });
    }

    const [players] = await db.execute("SELECT * FROM player WHERE ID_Game = ?", [gameId]);
    if (players.length < 2) { // minimum dynamique possible ici
      return res.status(400).json({ success: false, message: `Nombre de joueurs insuffisant (${players.length}/${game.TotalPlayers})` });
    }

    await db.execute("UPDATE game SET Status = 'in_progress' WHERE ID_Game = ?", [gameId]);

    res.json({ success: true, message: "Partie démarrée !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du démarrage de la partie" });
  }
});

export default router;

