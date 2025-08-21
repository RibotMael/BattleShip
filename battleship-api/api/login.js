// battleship-api / api / login.js

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
    const sql = "SELECT ID_Users, Email, Password, Pseudo, niveau, Avatar FROM users WHERE Email = ?";
    const [results] = await query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Email introuvable" });
    }

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Mot de passe invalide" });
    }

    const avatarBase64 = user.Avatar ? Buffer.from(user.Avatar).toString('base64') : null;

    return res.json({
      success: true,
      user: {
        id: user.ID_Users,
        email: user.Email,
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
