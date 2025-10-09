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
    `SELECT * FROM game_invites WHERE receiver_id = ? AND status = 'Pending'`,
    [userId]
  );
  return rows;
}

// Supprimer invitation
export async function removeInvitationFromDB(inviteId) {
  await db.execute(`DELETE FROM game_invites WHERE ID = ?`, [inviteId]);
}

export async function respondInviteDB(inviteId, accept) {
  const status = accept ? 'Accepted' : 'Rejected';
  await db.execute(`UPDATE game_invites SET status = ? WHERE ID = ?`, [status, inviteId]);
}

