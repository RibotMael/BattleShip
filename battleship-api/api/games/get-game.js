import express from "express";
import db from "../../db.js";

const router = express.Router();

// GET /api/games/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: "ID manquant" });

  try {
    // Récupérer la partie
    const [gameRows] = await db.execute(
      "SELECT *, team_mode_id AS TotalPlayers FROM games WHERE id_Game = ?",
      [id]
    );

    if (gameRows.length === 0)
      return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // Récupérer les joueurs
    const [players] = await db.execute(
      `SELECT gp.player_id AS ID_Users, u.Pseudo
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.player_id
       WHERE gp.game_id = ?`,
      [id]
    );

    // Optionnel : récupérer uniquement les joueurs "online"
    const onlinePlayers = players.map(p => p.ID_Users);

    res.json({
      success: true,
      game,
      players,
      onlinePlayers,
    });
  } catch (err) {
    console.error("Erreur get-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
