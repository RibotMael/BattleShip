// routes/games.js

import express from 'express';
import db from '../db.js';

const router = express.Router();

router.post('/games/create-game', async (req, res) => {
  const { langue, mode, isPrivate, total, hostId } = req.body;

  if (!hostId || !mode || !langue) {
    return res.status(400).json({ success: false, message: 'Paramètres manquants' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO games (Host_ID, Mode, Is_Private, Total_Players, Langue, Status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hostId, mode, isPrivate ? 1 : 0, total, langue, 'waiting']
    );

    const gameId = result.insertId;
    res.json({ success: true, gameId });
  } catch (err) {
    console.error("❌ Erreur SQL : ", err);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la partie.' });
  }
});

// routes/games.js

router.post('/games/join-game', async (req, res) => {
  const { gameId, playerId } = req.body;

  if (!gameId || !playerId) {
    return res.status(400).json({ success: false, message: 'Paramètres manquants' });
  }

  try {
    // Vérifier si la partie existe
    const [games] = await db.query('SELECT * FROM games WHERE ID_Game = ?', [gameId]);
    if (games.length === 0) {
      return res.status(404).json({ success: false, message: 'Partie introuvable' });
    }

    const game = games[0];

    // Vérifier combien de joueurs sont déjà dans la partie
    const [players] = await db.query(
      'SELECT COUNT(*) AS count FROM game_players WHERE Game_ID = ?',
      [gameId]
    );

    if (players[0].count >= game.Total_Players) {
      return res.status(403).json({ success: false, message: 'Partie déjà complète' });
    }

    // Ajouter le joueur
    db.query(
          'INSERT INTO game_players (Game_ID, Player_ID) VALUES (?, ?)',
          [gameId, playerId]
      );

    res.json({ success: true, message: 'Joueur ajouté à la partie' });
  } catch (err) {
    console.error("Erreur lors de la jonction à la partie :", err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.get('/game-status/:gameId', async (req, res) => {
  const gameId = req.params.gameId;

  try {
    // Récupérer la partie
    const [games] = await db.query('SELECT * FROM games WHERE ID_Game = ?', [gameId]);
    if (games.length === 0) {
      return res.status(404).json({ success: false, message: 'Partie introuvable' });
    }

    const game = games[0];

    // Récupérer les joueurs
    const [players] = await db.query(
      `SELECT u.id, u.pseudo
       FROM game_players gp
       JOIN users u ON gp.Player_ID = u.id
       WHERE gp.Game_ID = ?`,
      [gameId]
    );

    // Si nombre atteint → mettre à jour statut "ready"
    if (players.length >= game.Total_Players && game.Status !== 'ready') {
      await db.query('UPDATE games SET Status = ? WHERE ID_Game = ?', ['ready', gameId]);
      game.Status = 'ready';
    }

    res.json({
      success: true,
      status: game.Status,
      totalPlayers: game.Total_Players,
      players
    });
  } catch (err) {
    console.error('Erreur statut game :', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


export default router;
