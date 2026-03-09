// battleship-api/api/games/join-game.js

import express from "express";
import db from "../../db.js";
import { computeTotalPlayers } from "../../utils/gameRules.js";

const router = express.Router();

// Rejoindre une partie
router.post("/join", async (req, res) => {
  const gameId = Number(req.body.gameId);
  const playerId = Number(req.body.playerId);

  if (!gameId || !playerId) {
    return res.status(400).json({
      success: false,
      message: "Paramètres manquants",
    });
  }

  try {
    //   Récupérer la partie + team_size
    const [[game]] = await db.execute(
      `SELECT g.*, tm.team_size
       FROM games g
       LEFT JOIN team_mode tm ON tm.id_Team = g.id_team_mode
       WHERE g.id_Game = ?`,
      [gameId]
    );

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Partie introuvable",
      });
    }

    //   Nombre total de joueurs autorisés
    const totalPlayers = computeTotalPlayers(game, game.team_size);

    //   Vérifier si le joueur est déjà dans la partie
    const [[existing]] = await db.execute(
      `SELECT *
       FROM game_players
       WHERE id_game = ? AND id_player = ?`,
      [gameId, playerId]
    );

    if (existing) {
      // 🔁 Réactiver le joueur s’il avait quitté
      if (existing.player_status !== "in_game") {
        await db.execute(
          `UPDATE game_players
           SET player_status = 'in_game'
           WHERE id_game = ? AND id_player = ?`,
          [gameId, playerId]
        );
      }
    } else {
      //   Compter les joueurs actuellement en jeu
      const [[{ count }]] = await db.execute(
        `SELECT COUNT(*) AS count
         FROM game_players
         WHERE id_game = ? AND player_status = 'in_game'`,
        [gameId]
      );

      // 🔒 Partie complète (sauf Battle Royale)
      if (totalPlayers !== null && count >= totalPlayers) {
        return res.status(403).json({
          success: false,
          message: "La partie est complète",
        });
      }

      //   Déterminer le team_number
      const teamNumber = count + 1;

      await db.execute(
        `INSERT INTO game_players
         (id_game, id_player, team_number, player_status)
         VALUES (?, ?, ?, 'in_game')`,
        [gameId, playerId, teamNumber]
      );

      //   Si la partie est maintenant complète → in_progress
      if (totalPlayers !== null && count + 1 >= totalPlayers) {
        await db.execute(
          `UPDATE games
           SET status = 'in_progress'
           WHERE id_Game = ?`,
          [gameId]
        );
      }
    }

    //   Récupérer l’état final de la partie
    const [[updatedGame]] = await db.execute(
      `SELECT status FROM games WHERE id_Game = ?`,
      [gameId]
    );

    //   Récupérer la liste des joueurs
    const [players] = await db.execute(
      `SELECT gp.id_player AS ID_Users,
              gp.player_status,
              u.Pseudo
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
        status: updatedGame.status,
        id_creator: game.id_creator,
        TotalPlayers: totalPlayers,
      },
      players,
    });
  } catch (err) {
    console.error("❌ join-game", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});

export default router;
