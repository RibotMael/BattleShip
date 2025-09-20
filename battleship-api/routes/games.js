// battleship-api/routes/games.js
import express from 'express';
import db from '../db.js';
import { sendInvite, getInvitationsForUser, removeInvitation } from '../stores/invitationStore.js';

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
    const [modeRow] = await db.execute(
      'SELECT id_Mode FROM mode WHERE name = ?',
      [isPrivate ? 'Private' : 'Public']
    );
    if (!modeRow.length) throw new Error("Mode introuvable");
    const id_game_mode = modeRow[0].id_Mode;

    const typeName = totalPlayers > 2 ? 'Team' : 'Solo';
    const [typeRow] = await db.execute(
      'SELECT id_Type FROM type WHERE name = ?',
      [typeName]
    );
    if (!typeRow.length) throw new Error("Type introuvable");
    const id_game_type = typeRow[0].id_Type;

    const versionName = language === 'fr' ? 'French' : 'Belgium';
    const [versionRow] = await db.execute(
      'SELECT id_Version FROM version WHERE name = ?',
      [versionName]
    );
    if (!versionRow.length) throw new Error("Version introuvable");
    const id_version = versionRow[0].id_Version;

    let id_team_mode = null;
    if (totalPlayers > 2) {
      const [teamRow] = await db.execute(
        'SELECT id_Team FROM team_mode WHERE team_size = ?',
        [totalPlayers]
      );
      if (!teamRow.length) throw new Error("Team mode introuvable");
      id_team_mode = teamRow[0].id_Team;
    }

    const [result] = await db.execute(
      `INSERT INTO games 
        (id_creator, id_game_mode, id_game_type, id_team_mode, id_version, status)
        VALUES (?, ?, ?, ?, ?, 'preparation')`,
      [hostId, id_game_mode, id_game_type, id_team_mode, id_version]
    );

    const gameId = result.insertId;

    res.json({
      success: true,
      gameId,
      game: {
        ID_Game: gameId,
        id_creator: hostId,
        id_game_mode,
        id_game_type,
        id_team_mode,
        id_version,
        Status: 'preparation',
        TotalPlayers: totalPlayers
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
  const totalPlayers = sanitize(req.body.totalPlayers);
  if (!gameId || !playerId || !totalPlayers) 
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    const [already] = await db.execute(
      'SELECT * FROM game_players WHERE id_game = ? AND id_player = ?',
      [gameId, playerId]
    );
    if (already.length) return res.json({ success: true, message: "Joueur déjà dans la partie" });

    const [games] = await db.execute('SELECT * FROM games WHERE id_Game = ?', [gameId]);
    if (!games.length) return res.status(404).json({ success: false, message: "Partie non trouvée" });
    const game = games[0];

    const [current] = await db.execute('SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?', [gameId]);
    if (current[0].count >= totalPlayers) 
      return res.status(400).json({ success: false, message: "Partie déjà pleine" });

    const teamNumber = current[0].count + 1;
    await db.execute(
      'INSERT INTO game_players (id_game, id_player, team_number, player_status) VALUES (?, ?, ?, "in_game")',
      [gameId, playerId, teamNumber]
    );

    let newStatus = game.status;
    

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
        ID_Game: gameId,
        status: newStatus,
        id_creator: game.id_creator,
        TotalPlayers: totalPlayers
      },
      players
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'ajout au jeu" });
  }
});

// Envoyer une invitation à un ami pour rejoindre la partie
router.post('/invite', async (req, res) => {
  const { gameId, senderId, receiverId } = req.body;
  if (!gameId || !senderId || !receiverId)
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    // Récupère pseudo de l'envoyeur
    const [rows] = await db.execute('SELECT Pseudo FROM users WHERE ID_Users = ?', [senderId]);
    const senderPseudo = rows[0]?.Pseudo || 'Anonyme';

    sendInvite(gameId, senderId, receiverId, senderPseudo);

    res.json({ success: true, message: "Invitation envoyée" });
  } catch (err) {
    console.error("invite error :", err);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'invitation" });
  }
});

// Récupérer les invitations pour un utilisateur
router.get('/invitations/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ success: false, message: "ID manquant" });

  try {
    const userInvitations = getInvitationsForUser(userId);
    res.json({ invitations: userInvitations });
  } catch (err) {
    console.error("get invitations error :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Répondre à une invitation
router.post('/respond', async (req, res) => {
  const { senderId, receiverId, accept } = req.body;
  if (!senderId || !receiverId) 
    return res.status(400).json({ success: false, message: "IDs manquants" });

  try {
    const status = accept ? 'Accepted' : 'Rejected';
    await db.execute(
      "UPDATE friends SET Status = ? WHERE Sender_ID = ? AND Receiver_ID = ?",
      [status, senderId, receiverId]
    );

    let gameId = null, totalPlayers = 2;
    if (accept) {
      const [gameRows] = await db.execute(
        "SELECT id_Game, id_team_mode FROM games WHERE id_creator = ?",
        [senderId]
      );
      if (gameRows.length) {
        gameId = gameRows[0].id_Game;
        totalPlayers = gameRows[0].id_team_mode || 2;
      }
    }

    res.json({ success: true, gameId, totalPlayers });
  } catch (err) {
    console.error("respond error :", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Répondre à une invitation (accept/reject)
router.post('/respond-invite', async (req, res) => {
  const { userId, gameId, senderId, accept } = req.body;
  if (!userId || !gameId || !senderId)
    return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    removeInvitation(gameId, userId);
    res.json({ success: true, message: accept ? "Invitation acceptée" : "Invitation refusée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Quitter une partie
router.post('/leave', async (req, res) => {
  const gameId = sanitize(req.body.gameId);
  const playerId = sanitize(req.body.playerId);
  if (!gameId || !playerId) return res.status(400).json({ success: false, message: "Paramètres manquants" });

  try {
    await db.execute('DELETE FROM game_players WHERE id_game = ? AND id_player = ?', [gameId, playerId]);

    const [remaining] = await db.execute('SELECT COUNT(*) AS count FROM game_players WHERE id_game = ?', [gameId]);
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
    await db.execute('DELETE FROM game_players WHERE id_game = ?', [gameId]);
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
      `SELECT gp.id_player AS ID_Users, u.Pseudo 
       FROM game_players gp
       JOIN users u ON u.ID_Users = gp.id_player
       WHERE gp.id_game = ?`,
      [gameId]
    );

    res.json({ success: true, game, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de la partie" });
  }
});

// Démarrer la partie (host)
router.post("/start/:id", async (req, res) => {
  const gameId = req.params.id;

  try {
    // Vérifier si la partie existe
    const [rows] = await db.query("SELECT * FROM games WHERE ID_Game = ?", [gameId]);
    if (rows.length === 0) {
      return res.json({ success: false, message: "Partie introuvable" });
    }

    const game = rows[0];

    // Vérifier que la partie n'est pas déjà lancée
    if (game.status === "in_progress") {
      return res.json({ success: false, message: "La partie est déjà en cours", game });
    }

    // Vérifier que le nombre de joueurs est atteint
    const [players] = await db.query(
      "SELECT * FROM game_players WHERE id_game = ?",
      [gameId]
    );

    if (players.length < game.TotalPlayers) {
      return res.json({ success: false, message: "Nombre de joueurs insuffisant", players });
    }

    // Mettre à jour le statut de la partie
    await db.query(
      "UPDATE games SET status = 'in_progress' WHERE ID_Game = ?",
      [gameId]
    );

    // Récupérer la partie mise à jour
    const [updated] = await db.query("SELECT * FROM games WHERE ID_Game = ?", [gameId]);

    return res.json({
      success: true,
      game: updated[0],
      players
    });
  } catch (err) {
    console.error("Erreur start game:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
