import db from "../db.js";

/**
 * ENVOYER une invitation
 */
export async function sendInviteToDB({ gameId, senderId, receiverId }) {
  try {
    // Vérifier les doublons pour éviter d'envoyer 10 fois la même invit
    const [existing] = await db.execute(
      `SELECT ID FROM game_invites 
       WHERE id_game = ? AND sender_id = ? AND receiver_id = ? AND status = 'Pending'`,
      [gameId, senderId, receiverId]
    );
    if (existing.length > 0) throw new Error("Invitation déjà en cours");

    const [result] = await db.execute(
      `INSERT INTO game_invites (id_game, sender_id, receiver_id, status)
       VALUES (?, ?, ?, 'Pending')`,
      [gameId, senderId, receiverId]
    );
    return result.insertId;
  } catch (err) {
    console.error("[SEND INVITE ERROR]", err.message);
    throw err;
  }
}

/**
 * RÉCUPÉRER les invitations pour un utilisateur
 */
export async function getInvitationsForUserFromDB(userId) {
  const sql = `
    SELECT gi.ID, gi.id_game, gi.sender_id, u.Pseudo AS senderPseudo
    FROM game_invites gi
    JOIN users u ON gi.sender_id = u.ID_Users
    WHERE gi.receiver_id = ? AND gi.status = 'Pending'
  `;
  const [rows] = await db.execute(sql, [userId]);
  return rows;
}

/**
 * RÉPONDRE à une invitation (Accepter/Refuser)
 */
export async function respondInviteDB(inviteId, accept, userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const status = accept ? 'Accepted' : 'Rejected';

    const [updateRes] = await connection.execute(
      `UPDATE game_invites SET status = ? WHERE ID = ? AND receiver_id = ?`,
      [status, inviteId, userId]
    );

    if (accept) {
      const [invites] = await connection.execute(
        `SELECT id_game FROM game_invites WHERE ID = ?`, [inviteId]
      );
      const id_game = invites[0].id_game;

      // Correction ici : id_player (selon ta BDD) et player_status 'in_game'
      await connection.execute(
        `INSERT IGNORE INTO game_players (id_game, id_player, player_status) 
         VALUES (?, ?, 'in_game')`,
        [id_game, userId]
      );
    }
    await connection.commit();
    return { success: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * SUPPRIMER une invitation
 */
export async function removeInvitationFromDB(inviteId) {
  const [result] = await db.execute(`DELETE FROM game_invites WHERE ID = ?`, [inviteId]);
  return result.affectedRows > 0;
}