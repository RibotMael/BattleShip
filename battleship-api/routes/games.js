// battleship-api/routes/games.js
import express from 'express';
import db from '../db.js';
import { sendInvite, getInvitationsForUser, removeInvite } from '../stores/invitationStore.js';


const router = express.Router();

function sanitize(param) {
  return param !== undefined ? param : null;
}

// Créer une partie
router.post('/create-game', async (req, res) => {
  const { hostId, mode, language, isPrivate, totalPlayers } = req.body;
  if (!hostId || !mode || !language || !totalPlayers) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  try {
    // Récupérer mode
    const [modeRow] = await db.execute(
      'SELECT id_Mode FROM mode WHERE name = ?',
      [isPrivate ? 'Private' : 'Public']
    );
    if (!modeRow.length) throw new Error("Mode introuvable");
    const game_mode_id = modeRow[0].id_Mode;

    // Récupérer type
    const typeName = totalPlayers > 2 ? 'Team' : 'Solo';
    const [typeRow] = await db.execute(
      'SELECT id_Type FROM type WHERE name = ?',
      [typeName]
    );
    if (!typeRow.length) throw new Error("Type introuvable");
    const game_type_id = typeRow[0].id_Type;

    // Récupérer version
    const versionName = language === 'fr' ? 'French' : 'Belgium';
    const [versionRow] = await db.execute(
      'SELECT id_Version FROM version WHERE name = ?',
      [versionName]
    );
    if (!versionRow.length) throw new Error("Version introuvable");
    const version_id = versionRow[0].id_Version;

    // Récupérer team_mode_id seulement si Team
    let team_mode_id = null;
    if (totalPlayers > 2) {
      const [teamRow] = await db.execute(
        'SELECT id_Team FROM team_mode WHERE team_size = ?',
        [totalPlayers]
      );
      if (!teamRow.length) throw new Error("Team mode introuvable");
      team_mode_id = teamRow[0].id_Team;
    }

    // Créer la partie
    const [result] = await db.execute(
      `INSERT INTO games 
        (creator_id, game_mode_id, game_type_id, team_mode_id, version_id, status)
        VALUES (?, ?, ?, ?, ?, 'preparation')`,
      [hostId, game_mode_id, game_type_id, team_mode_id, version_id]
    );

    const gameId = result.insertId;

    res.json({
      success: true,
      gameId,
      game: {
        ID_Game: gameId,
        creator_id: hostId,
        game_mode_id,
        game_type_id,
        team_mode_id,
        version_id,
        Status: 'preparation',
        TotalPlayers: totalPlayers // côté front seulement
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur lors de la création de la partie" });
  }
});

// Rejoindre une partie
router.post('/join', async (req, res) => {
  const gameId = sanitize(req.body.gameId);
  const playerId = sanitize(req.body.playerId);
  const totalPlayers = sanitize(req.body.totalPlayers); // envoyé par le front
  if (!gameId || !playerId || !totalPlayers) 
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [already] = await db.execute(
      'SELECT * FROM game_players WHERE game_id = ? AND player_id = ?',
      [gameId, playerId]
    );
    if (already.length) return res.json({ success: true, message: "Joueur déjà dans la partie" });

    const [games] = await db.execute('SELECT * FROM games WHERE id_Game = ?', [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie non trouvée" });
    const game = games[0];

    const [current] = await db.execute('SELECT COUNT(*) AS count FROM game_players WHERE game_id = ?', [gameId]);
    if (current[0].count >= totalPlayers) 
      return res.status(400).json({ success: false, message: "Partie déjà pleine" });

    const teamNumber = current[0].count + 1;
    await db.execute(
      'INSERT INTO game_players (game_id, player_id, team_number, player_status) VALUES (?, ?, ?, "in_game")',
      [gameId, playerId, teamNumber]
    );

    // Mettre à jour status si complet
    let newStatus = game.status;
    if (current[0].count + 1 === totalPlayers) {
      await db.execute('UPDATE games SET status = "started" WHERE id_Game = ?', [gameId]);
      newStatus = 'started';
    }

    const [players] = await db.execute(
      `SELECT gp.player_id AS ID_Users, u.Pseudo 
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.player_id
       WHERE gp.game_id = ?`,
      [gameId]
    );

    res.json({
      success: true,
      message: "Rejoint la partie",
      game: {
        ID_Game: gameId,
        status: newStatus,
        creator_id: game.creator_id,
        TotalPlayers: totalPlayers
      },
      players
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'ajout au jeu" });
  }
});

// Envoyer une invitation
router.post("/invite", (req, res) => {
  const { gameId, fromId, toId, senderPseudo } = req.body;
  if (!gameId || !fromId || !toId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  sendInvite({ gameId, fromId, toId, senderPseudo });
  res.json({ success: true, message: "Invitation envoyée" });
});

// Récupérer les invitations pour un utilisateur
router.get("/invitations/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ success: false, message: "ID manquant" });

  const invs = getInvitationsForUser(userId);
  res.json(invs);
});

// Répondre à une invitation
router.post("/respond-invite", (req, res) => {
  const { userId, gameId, senderId, accept } = req.body;
  if (!userId || !gameId || !senderId) {
    return res.status(400).json({ success: false, message: "Paramètres manquants" });
  }

  removeInvite(gameId, userId);

  if (accept) {
    // Rediriger l'utilisateur côté front pour rejoindre la partie
    return res.json({ success: true, message: "Invitation acceptée" });
  } else {
    return res.json({ success: true, message: "Invitation refusée" });
  }
});

// Quitter une partie
router.post('/leave', async (req, res) => {
  const gameId = sanitize(req.body.gameId);
  const playerId = sanitize(req.body.playerId);
  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    await db.execute('DELETE FROM game_players WHERE game_id = ? AND player_id = ?', [gameId, playerId]);

    const [remaining] = await db.execute('SELECT COUNT(*) AS count FROM game_players WHERE game_id = ?', [gameId]);
    if (remaining[0].count === 0) {
      await db.execute('DELETE FROM games WHERE id_Game = ?', [gameId]);
      return res.json({ success: true, message: "Partie supprimée, aucun joueur restant" });
    }

    res.json({ success: true, message: "Joueur retiré", remainingPlayers: remaining[0].count });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur lors du départ du joueur" });
  }
});

// Supprimer tous les joueurs (host)
router.post('/clear-players', async (req, res) => {
  const { gameId } = req.body;
  if (!gameId) return res.status(400).json({ success: false, message: "Paramètre manquant" });
  try {
    await db.execute('DELETE FROM game_players WHERE game_id = ?', [gameId]);
    await db.execute('DELETE FROM games WHERE id_Game = ?', [gameId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Récupérer une partie
router.get('/:id', async (req, res) => {
  const gameId = sanitize(req.params.id);
  if (!gameId) return res.status(400).json({ success: false, message: "ID de partie manquant" });

  try {
    const [games] = await db.execute('SELECT * FROM games WHERE id_Game = ?', [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie introuvable" });

    const game = games[0];

    const [players] = await db.execute(
      `SELECT gp.player_id AS ID_Users, u.Pseudo 
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.player_id
       WHERE gp.game_id = ?`,
      [gameId]
    );

    res.json({ success: true, game, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de la partie" });
  }
});

// Démarrer la partie (host)
router.post('/start/:id', async (req, res) => {
  const gameId = sanitize(req.params.id);
  if (!gameId) return res.status(400).json({ success: false, message: "ID de partie manquant" });

  try {
    await db.execute('UPDATE games SET status = "started" WHERE id_Game = ?', [gameId]);
    res.json({ success: true, message: "Partie démarrée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
