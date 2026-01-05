//BattleShip-api/routes/stores/invitationStore.js

import db from "../db.js";

// Envoyer une invitation
export async function sendInviteToDB({ gameId, senderId, receiverId }) {
  try {
    const [result] = await db.execute(
      `INSERT INTO game_invites (id_game, sender_id, receiver_id, status)
       VALUES (?, ?, ?, 'Pending')`,
      [gameId, senderId, receiverId]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
}

export async function getInvitationsForUserFromDB(userId) {
  const [rows] = await db.execute(
    `SELECT 
       gi.ID, 
       gi.id_game AS gameId, 
       gi.sender_id AS senderId,
       u.Pseudo AS senderPseudo,
       u.Avatar AS avatarId,
       gi.status
     FROM game_invites gi
     LEFT JOIN users u ON gi.sender_id = u.ID_Users
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
  await db.execute(`DELETE FROM game_invites WHERE ID = ?`, [inviteId]);
}

export async function respondInviteDB(inviteId, accept) {
  const status = accept ? 'Accepted' : 'Rejected';
  await db.execute(`UPDATE game_invites SET status = ? WHERE ID = ?`, [status, inviteId]);
}

