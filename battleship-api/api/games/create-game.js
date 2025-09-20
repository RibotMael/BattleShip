// battleship-api/api/games/create-game.js
import express from 'express';
import db from '../../db.js'; 

const router = express.Router();

function sanitizeParam(param) {
  return param !== undefined ? param : null;
}

// Créer une partie
router.post('/create-game', async (req, res) => {
  const creatorId = sanitizeParam(req.body.creatorId);
  const gameModeId = sanitizeParam(req.body.gameModeId);
  const gameTypeId = sanitizeParam(req.body.gameTypeId);
  const teamModeId = sanitizeParam(req.body.teamModeId); // optionnel
  const versionId = sanitizeParam(req.body.versionId);
  const language = sanitizeParam(req.body.language) || 'fr'; // <-- prend la langue envoyée ou 'fr'
  let totalPlayers = sanitizeParam(req.body.totalPlayers) || 2;

  if (!creatorId || !gameModeId || !gameTypeId || !versionId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants ou invalides." });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO games (id_creator, id_game_mode, id_game_type, id_team_mode, id_version, status, language)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [creatorId, gameModeId, gameTypeId, teamModeId, versionId, 'preparation', language]
    );

    const gameId = result.insertId;

    res.json({
      success: true,
      gameId,
      game: {
        id_Game: gameId,
        id_creator: creatorId,
        id_game_mode: gameModeId,
        id_game_type: gameTypeId,
        id_team_mode: teamModeId,
        id_version: versionId,
        totalPlayers,
        language, // <-- renvoie la langue côté front
        status: 'preparation'
      }
    });

  } catch (err) {
    console.error("Erreur création partie :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la création de la partie." });
  }
});

// Récupérer une partie par ID
router.get('/:id', async (req, res) => {
  const gameId = sanitizeParam(req.params.id);
  if (!gameId) return res.status(400).json({ success: false, message: "ID de partie manquant." });

  try {
    const [games] = await db.execute('SELECT * FROM games WHERE id_Game = ?', [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable." });

    const game = games[0];

    const [players] = await db.execute(
      `SELECT gp.id_player AS ID_Users, u.Pseudo 
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.id_player
       WHERE gp.id_game = ?`,
      [gameId]
    );

    res.json({ success: true, game, players });

  } catch (err) {
    console.error("Erreur récupération partie :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération de la partie." });
  }
});

export default router;
