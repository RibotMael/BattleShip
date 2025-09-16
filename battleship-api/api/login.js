// battleship-api/api/login.js

import { Router } from 'express';
import { query } from '../db';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email et mot de passe requis" });
  }

  try {
    const sql = "SELECT ID_Users, Mail, MotDePasse, Pseudo, niveau, Avatar FROM users WHERE Mail = ?";
    const [results] = await query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Email introuvable" });
    }

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.MotDePasse);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Mot de passe invalide" });
    }

    // Récupérer l'avatar dans la table avatar
    let avatarBase64 = null;
    if (user.Avatar) {
      const [avatarRows] = await query("SELECT Avatar, mime_type FROM avatar WHERE ID_Avatar = ?", [user.Avatar]);
      if (avatarRows.length > 0) {
        avatarBase64 = `data:${avatarRows[0].mime_type};base64,${avatarRows[0].Avatar.toString("base64")}`;
      }
    }

    return res.json({
      success: true,
      user: {
        id: user.ID_Users,
        email: user.Mail,
        pseudo: user.Pseudo,
        niveau: user.niveau,
        avatar: avatarBase64
      }
    });
  } catch (err) {
    console.error("Erreur login:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
