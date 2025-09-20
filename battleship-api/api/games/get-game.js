import express from "express";
import db from "../../db.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: "ID manquant" });

  try {
    // Partie
    const [gameRows] = await db.execute(
      `SELECT id_Game AS ID_Game,
              id_creator,
              status,
              id_game_type,
              id_team_mode,
              id_version
       FROM games
       WHERE id_Game = ?`,
      [id]
    );

    if (gameRows.length === 0)
      return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = gameRows[0];

    // Calcul dynamique du nombre de joueurs attendu
    let totalPlayers = null;
    if (game.id_game_type === 3) { // Solo
      totalPlayers = 2;
    } else if (game.id_game_type === 1) { // BattleRoyal
      totalPlayers = 0; // illimité
    } else if (game.id_game_type === 2 && game.id_team_mode) { // Team
      const [teamModes] = await db.execute(
        "SELECT team_size FROM team_mode WHERE id_Team = ?",
        [game.id_team_mode]
      );
      totalPlayers = teamModes.length ? teamModes[0].team_size : null;
    }

    // Joueurs
    const [players] = await db.execute(
      `SELECT gp.id_player AS ID_Users,
              u.Pseudo
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.id_player
       WHERE gp.id_game = ?`,
      [id]
    );

    // On renvoie le totalPlayers calculé sans toucher à la BDD
    res.json({
      success: true,
      game: { ...game, TotalPlayers: totalPlayers },
      players
    });
  } catch (err) {
    console.error("Erreur get-game:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
