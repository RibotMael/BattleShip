//BattleShip-api/routes/stores/invitationStore.js

import db from "../db.js";

// Envoyer une invitation
export async function sendInviteToDB({ gameId, senderId, receiverId }) {
  try {
    // Vérifier que les IDs existent
    const [[game]] = await db.execute(`SELECT id_Game FROM games WHERE id_Game = ?`, [gameId]);
    if (!game) throw new Error("Partie inexistante");

    const [[sender]] = await db.execute(`SELECT ID_Users FROM users WHERE ID_Users = ?`, [senderId]);
    if (!sender) throw new Error("Utilisateur émetteur inexistant");

    const [[receiver]] = await db.execute(`SELECT ID_Users FROM users WHERE ID_Users = ?`, [receiverId]);
    if (!receiver) throw new Error("Utilisateur destinataire inexistant");

    // Vérifier que l'invitation n'existe pas déjà
    const [existing] = await db.execute(
      `SELECT ID FROM game_invites 
       WHERE id_game = ? AND sender_id = ? AND receiver_id = ? AND status = 'Pending'`,
      [gameId, senderId, receiverId]
    );
    if (existing.length > 0) throw new Error("Invitation déjà envoyée");

    const [result] = await db.execute(
      `INSERT INTO game_invites (id_game, sender_id, receiver_id, status)
       VALUES (?, ?, ?, 'Pending')`,
      [gameId, senderId, receiverId]
    );
    return result.insertId;
  } catch (err) {
    console.error("[INVITE DB ERROR]", err.message);
    throw err;
  }
}

// Récupérer les invitations pour un utilisateur
export async function getInvitationsForUserFromDB(userId) {
  const [rows] = await db.execute(
<<<<<<< HEAD
    `SELECT gi.*, u.Pseudo AS senderPseudo
     FROM game_invites gi
     JOIN users u ON gi.sender_id = u.ID_Users
=======
    `SELECT 
       gi.ID, 
       gi.id_game AS gameId, 
       gi.sender_id AS senderId,
       u.Pseudo AS senderPseudo,
       u.Avatar AS avatarId,
       gi.status
     FROM game_invites gi
     LEFT JOIN users u ON gi.sender_id = u.ID_Users
>>>>>>> 63aebf3 (pseudo dans invitation, positionnement aléatoire lors du placement des bateaux)
     WHERE gi.receiver_id = ? AND gi.status = 'Pending'`,
    [userId]
  );

  // Normalisation pour le front
  const invitations = rows.map(inv => ({
    ID: inv.ID,
    gameId: inv.gameId,
    senderId: inv.senderId,
    senderPseudo: inv.senderPseudo ?? `Joueur #${inv.senderId}`,
    avatarUrl: inv.avatarId ? `/avatars/${inv.avatarId}.png` : null, // exemple si tu stockes les avatars en fichiers
    status: inv.status
  }));

  return invitations;
}


// Supprimer invitation
export async function removeInvitationFromDB(inviteId) {
  const [result] = await db.execute(`DELETE FROM game_invites WHERE ID = ?`, [inviteId]);
  return result.affectedRows;
}


// Répondre à une invitation (accept/reject)
export async function respondInviteDB(inviteId, accept, receiverId) {
  const status = accept ? "Accepted" : "Rejected";
  const [result] = await db.execute(
    `UPDATE game_invites SET status = ? WHERE ID = ? AND receiver_id = ?`,
    [status, inviteId, receiverId]
  );
  return result.affectedRows;
}
