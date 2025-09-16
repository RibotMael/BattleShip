// battleship-api/api/games/leave-game.js
import express from 'express';
import db from '../../db.js';

const router = express.Router();

router.post('/leave-game', async (req, res) => {
  const { gameId, playerId } = req.body;
  if (!gameId || !playerId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Vérifier si la partie existe et récupérer l'hôte
    const [gameRows] = await db.execute(
      "SELECT creator_id, status, team_mode_id FROM games WHERE id_Game = ?",
      [gameId]
    );
    if (gameRows.length === 0) {
      return res.status(404).json({ success: false, message: "Partie introuvable" });
    }

    const game = gameRows[0];
    const isHost = Number(game.creator_id) === Number(playerId);

    if (isHost) {
      // L'hôte supprime la partie : supprimer tous les joueurs et la partie
      await db.execute("DELETE FROM game_players WHERE game_id = ?", [gameId]);
      await db.execute("DELETE FROM games WHERE id_Game = ?", [gameId]);
      return res.json({ success: true, message: "Partie supprimée par l'hôte" });
    } else {
      // Joueur normal : juste quitter la partie
      const [playerRows] = await db.execute(
        "SELECT * FROM game_players WHERE game_id = ? AND player_id = ?",
        [gameId, playerId]
      );
      if (playerRows.length === 0) {
        return res.status(404).json({ success: false, message: "Joueur non trouvé dans cette partie" });
      }

      await db.execute(
        "DELETE FROM game_players WHERE game_id = ? AND player_id = ?",
        [gameId, playerId]
      );

      // Vérifier le nombre de joueurs restants
      const [remaining] = await db.execute(
        "SELECT COUNT(*) AS count FROM game_players WHERE game_id = ?",
        [gameId]
      );

      // Mettre à jour le statut de la partie si nécessaire
      if (game.status === 'ready') {
        const totalPlayers = game.team_mode_id || 2; // fallback si team_mode_id nul
        if (remaining[0].count < totalPlayers) {
          await db.execute("UPDATE games SET status = 'waiting' WHERE id_Game = ?", [gameId]);
        }
      }

      return res.json({ 
        success: true, 
        message: "Vous avez quitté la partie", 
        remainingPlayers: remaining[0].count 
      });
    }
  } catch (err) {
    console.error("Erreur leave-game :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du départ du joueur" });
  }
});

export default router;