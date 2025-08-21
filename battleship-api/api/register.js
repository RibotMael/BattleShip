// battleship-api/api/register.js

import { Router } from 'express';
import { query } from '../db';
import bcrypt from 'bcrypt';

const saltRounds = 10;
const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  // Vérification du format de l’email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Email invalide." });
  }

  try {
    // Vérifie si l'email existe déjà
    const [existing] = await query(`SELECT ID_Users FROM users WHERE Email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Convertir l'avatar base64 en buffer
    const avatarBuffer = Buffer.from(avatar, 'base64');

    // Insertion en base
    const insertSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(insertSql, [email, hashedPassword, pseudo, birthDay, avatarBuffer, 1]);

    return res.json({ success: true });

  } catch (err) {
    console.error("Erreur dans l'enregistrement :", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
