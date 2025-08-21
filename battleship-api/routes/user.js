// battleship-api/routes/user.js

import { Router } from 'express';
import { query } from '../db.js';
const router = Router();

// Afficher un utilisateur
router.get('/:id', (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT ID_Users, Email, Pseudo, BirthDay, niveau, Avatar FROM users WHERE ID_Users = ?";

  query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Erreur base de données :', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = results[0];
    const avatarBase64 = Buffer.from(user.Avatar).toString('base64');

    res.json({
      id: user.ID_Users,
      email: user.Email,
      pseudo: user.Pseudo,
      birthDay: user.BirthDay,
      niveau: user.niveau,
      avatar: avatarBase64
    });
  });
});

// Modifier le profil utilisateur

router.put('/:id', (req, res) => {
  const userId = req.params.id;
  const { pseudo, avatar } = req.body;

  if (!pseudo) {
    return res.status(400).json({ message: "Pseudo requis." });
  }

  let avatarBuffer = null;
  if (avatar) {
    try {
      avatarBuffer = Buffer.from(avatar, 'base64');
    } catch (e) {
      console.error("Erreur conversion base64 avatar :", e);
      return res.status(400).json({ message: "Avatar invalide" });
    }
  }

  const sql = avatarBuffer
    ? "UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?"
    : "UPDATE users SET Pseudo = ? WHERE ID_Users = ?";
  const params = avatarBuffer ? [pseudo, avatarBuffer, userId] : [pseudo, userId];

  query(sql, params, (err, result) => {
    if (err) {
      console.error("Erreur mise à jour :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (result.affectedRows > 0) {
      const selectSql = "SELECT ID_Users, Email, Pseudo, BirthDay, niveau, Avatar FROM users WHERE ID_Users = ?";
      query(selectSql, [userId], (err2, results) => {
        if (err2) {
          console.error("Erreur lecture post update :", err2);
          return res.status(500).json({ message: "Erreur serveur" });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: "Utilisateur non trouvé après mise à jour" });
        }

        const user = results[0];
        const avatarBase64 = user.Avatar ? Buffer.from(user.Avatar).toString('base64') : null;

        res.json({
          id: user.ID_Users,
          email: user.Email,
          pseudo: user.Pseudo,
          birthDay: user.BirthDay,
          niveau: user.niveau,
          avatar: avatarBase64
        });
      });
    } else {
      res.status(404).json({ message: "Utilisateur non trouvé" });
    }
  });
});

export default router;
