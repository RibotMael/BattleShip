// battleship-api/api/games/delete-game.js
import express from 'express';
import db from '../../db.js';

const router = express.Router();

// DELETE /api/games/delete-game/:gameId
router.delete('/:gameId', async (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.query;

  if (!gameId || !playerId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Vérifier que la partie existe et récupérer l'hôte
    const [gameRows] = await db.execute(
      "SELECT creator_id FROM games WHERE id_Game = ?",
      [gameId]
    );

    if (gameRows.length === 0) {
      return res.status(404).json({ success: false, message: "Partie introuvable" });
    }

    const game = gameRows[0];

    // Vérifier que c'est bien l'hôte
    if (Number(game.creator_id) !== Number(playerId)) {
      return res.status(403).json({ success: false, message: "Seul l'hôte peut supprimer la partie" });
    }

    // Supprimer tous les joueurs de cette partie
    await db.execute("DELETE FROM game_players WHERE game_id = ?", [gameId]);

    // Supprimer la partie
    await db.execute("DELETE FROM games WHERE id_Game = ?", [gameId]);

    return res.json({ success: true, message: "Partie supprimée avec succès" });

  } catch (err) {
    console.error("Erreur delete-game :", err);
    return res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la partie" });
  }
});

export default router;