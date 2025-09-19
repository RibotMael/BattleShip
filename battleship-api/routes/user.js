// battleship-api/routes/user.js
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// 🔹 Récupérer un utilisateur avec son avatar
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = `
    SELECT u.ID_Users, u.Email, u.Pseudo, u.BirthDay, u.niveau,
           a.Avatar AS avatar_blob, a.mime_type
    FROM users u
    LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
    WHERE u.ID_Users = ?
  `;

  try {
    const [rows] = await query(sql, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = rows[0];
    let avatar = null;
    if (user.avatar_blob) {
      const base64 = Buffer.from(user.avatar_blob).toString('base64');
      avatar = `data:${user.mime_type};base64,${base64}`;
    }

    res.json({
      id: user.ID_Users,
      email: user.Email,
      pseudo: user.Pseudo,
      birthDay: user.BirthDay,
      niveau: user.niveau,
      avatar
    });
  } catch (err) {
    console.error("Erreur SQL GET user:", err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// 🔹 Récupérer la liste des amis
router.get('/:id/list', async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = `
      SELECT u.ID_Users AS id, u.Pseudo AS pseudo, a.Avatar AS avatar_blob, u.Online AS isOnline
      FROM friends f
      JOIN users u 
        ON (u.ID_Users = f.Sender_ID OR u.ID_Users = f.Receiver_ID)
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE (f.Sender_ID = ? OR f.Receiver_ID = ?) 
        AND u.ID_Users != ?
    `;
    const [friends] = await query(sql, [userId, userId, userId]);

    // Transformer les avatars en base64
    const friendsWithAvatar = friends.map(f => {
      let avatar = null;
      if (f.avatar_blob) {
        const base64 = Buffer.from(f.avatar_blob).toString('base64');
        avatar = `data:image/png;base64,${base64}`;
      }
      return {
        id: f.id,
        pseudo: f.pseudo,
        avatar,
        isOnline: !!f.isOnline
      };
    });

    res.json({ success: true, friends: friendsWithAvatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// 🔹 Modifier pseudo + avatar
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { pseudo, avatar, mimeType = "image/png" } = req.body;

  if (!pseudo) return res.status(400).json({ message: "Pseudo requis." });

  try {
    let avatarId = null;

    const [[user]] = await query("SELECT Avatar FROM users WHERE ID_Users = ?", [userId]);
    const oldAvatarId = user?.Avatar || null;

    if (avatar) {
      const buffer = Buffer.from(avatar, 'base64');
      const extension = mimeType.split('/')[1] || 'png';
      const avatarName = `user_${userId}_${Date.now()}.${extension}`;

      const insertSql = "INSERT INTO avatar (Avatar, Name, mime_type) VALUES (?, ?, ?)";
      const [result] = await query(insertSql, [buffer, avatarName, mimeType]);
      avatarId = result.insertId;
    }

    let updateSql, params;
    if (avatarId) {
      updateSql = "UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?";
      params = [pseudo, avatarId, userId];
    } else {
      updateSql = "UPDATE users SET Pseudo = ? WHERE ID_Users = ?";
      params = [pseudo, userId];
    }

    const [updateResult] = await query(updateSql, params);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (avatarId && oldAvatarId) {
      await query("DELETE FROM avatar WHERE ID_Avatar = ?", [oldAvatarId]);
    }

    const selectSql = `
      SELECT u.ID_Users, u.Email, u.Pseudo, u.BirthDay, u.niveau,
             a.Avatar AS avatar_blob, a.mime_type
      FROM users u
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE u.ID_Users = ?
    `;
    const [rows] = await query(selectSql, [userId]);
    const updatedUser = rows[0];

    let avatarUrl = null;
    if (updatedUser.avatar_blob) {
      const base64 = Buffer.from(updatedUser.avatar_blob).toString('base64');
      avatarUrl = `data:${updatedUser.mime_type};base64,${base64}`;
    }

    res.json({
      id: updatedUser.ID_Users,
      email: updatedUser.Email,
      pseudo: updatedUser.Pseudo,
      birthDay: updatedUser.BirthDay,
      niveau: updatedUser.niveau,
      avatar: avatarUrl
    });

  } catch (err) {
    console.error("Erreur SQL PUT user:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 🔹 Supprimer un utilisateur (+ son avatar lié)
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const [[user]] = await query("SELECT Avatar FROM users WHERE ID_Users = ?", [userId]);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    await query("DELETE FROM users WHERE ID_Users = ?", [userId]);

    if (user.Avatar) {
      await query("DELETE FROM avatar WHERE ID_Avatar = ?", [user.Avatar]);
    }

    res.sendStatus(204);
  } catch (err) {
    console.error("Erreur suppression utilisateur :", err.message);
    res.status(500).json({ message: "Erreur lors de la suppression : " + err.message });
  }
});

export default router;
