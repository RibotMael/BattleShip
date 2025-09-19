// battleship-api/api/games/join-game.js
import express from "express";
import db from "../../db.js";

const router = express.Router();

function sanitize(param) {
  return param !== undefined ? param : null;
}

// Rejoindre une partie
router.post('/join', async (req, res) => {
  const { gameId, playerId, totalPlayers } = req.body;

  if (!gameId || !playerId || !totalPlayers) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Vérifier si la partie existe
    const [games] = await db.execute(
      'SELECT * FROM games WHERE id_Game = ?',
      [gameId]
    );
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });
    const game = games[0];

    // Vérifier si le joueur est déjà dans la partie
    const [already] = await db.execute(
      'SELECT * FROM game_players WHERE id_game = ? AND id_player = ?',
      [gameId, playerId]
    );
    if (already.length) {
      const [players] = await db.execute(
        `SELECT gp.id_player AS ID_Users, u.Pseudo
         FROM game_players gp
         JOIN users u ON u.ID_Users = gp.id_player
         WHERE gp.id_game = ?`,
        [gameId]
      );
      return res.json({
        success: true,
        message: "Déjà dans la partie",
        game: {
          ID_Game: game.id_Game,
          status: game.status,
          id_creator: game.id_creator,
          TotalPlayers: totalPlayers
        },
        players
      });
    }

    // Ajouter le joueur
    const [currentCount] = await db.execute(
      'SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?',
      [gameId]
    );
    const teamNumber = currentCount[0].count + 1;

    await db.execute(
      'INSERT INTO game_players (id_game, id_player, team_number, player_status) VALUES (?, ?, ?, "in_game")',
      [gameId, playerId, teamNumber]
    );

    // Mettre à jour le statut si nombre de joueurs atteint
    let newStatus = game.status;
    if (currentCount[0].count + 1 >= totalPlayers) {
      await db.execute(
        'UPDATE games SET status = "started" WHERE id_Game = ?',
        [gameId]
      );
      newStatus = "started";
    }

    // Récupérer la liste des joueurs
    const [players] = await db.execute(
      `SELECT gp.id_player AS ID_Users, u.Pseudo
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.id_player
       WHERE gp.id_game = ?`,
      [gameId]
    );

    res.json({
      success: true,
      message: "Rejoint la partie",
      game: {
        ID_Game: game.id_Game,
        status: newStatus,
        id_creator: game.id_creator,
        TotalPlayers: totalPlayers
      },
      players
    });

  } catch (err) {
    console.error("Erreur join:", err);
    res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});

export default router;
