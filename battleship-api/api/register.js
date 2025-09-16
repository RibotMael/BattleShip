// battleship-api/api/register.js

import { Router } from 'express';
import { query } from '../db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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
    const [existing] = await query(`SELECT ID_Users FROM users WHERE Mail = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    // Vérifie si le pseudo existe déjà
    const [pseudoCheck] = await query(`SELECT ID_Users FROM users WHERE Pseudo = ?`, [pseudo]);
    if (pseudoCheck.length > 0) {
      return res.status(409).json({ success: false, message: "Pseudo déjà pris." });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insérer avatar dans la table avatar
    const avatarBuffer = Buffer.from(avatar, 'base64');
    const mimeType = "image/png"; // ⚡ à adapter si tu veux gérer plusieurs formats
    const name = "avatar_" + crypto.randomBytes(6).toString("hex");

    const insertAvatarSql = `
      INSERT INTO avatar (Avatar, mime_type, Name)
      VALUES (?, ?, ?)
    `;
    const avatarResult = await query(insertAvatarSql, [avatarBuffer, mimeType, name]);
    const avatarId = avatarResult.insertId;

    // Insertion de l’utilisateur avec la FK vers avatar
    const insertUserSql = `
      INSERT INTO users (Mail, MotDePasse, Pseudo, Birthday, Avatar, niveau)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(insertUserSql, [email, hashedPassword, pseudo, birthDay, avatarId, 1]);

    return res.json({ success: true });

  } catch (err) {
    console.error("Erreur dans l'enregistrement :", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
