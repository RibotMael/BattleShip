// battleship-api/api/register.js
// FICHIER OBSOLÈTE — remplacé par /routes/auth.js

/*
import { Router } from 'express';
import { query } from '../db.js';
import bcrypt from 'bcrypt';

const saltRounds = 10;
const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  console.log("📩 Données reçues dans /register:", { email, pseudo, birthDay, avatar });

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  try {
    // Vérifie si l'email existe déjà
    const [existing] = await query(`SELECT ID_Users FROM users WHERE Email = ?`, [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    // Vérifie si le pseudo existe déjà
    const [pseudoCheck] = await query(`SELECT ID_Users FROM users WHERE Pseudo = ?`, [pseudo]);
    if (pseudoCheck.length > 0) {
      return res.status(409).json({ success: false, message: "Pseudo déjà pris." });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 🔹 Ici on utilise juste l'ID de l'avatar choisi, pas de Buffer
    const avatarId = avatar;

    // Insertion utilisateur
    const insertUserSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await query(insertUserSql, [
      email,
      hashedPassword,
      pseudo,
      birthDay,
      avatarId,
      1
    ]);

    return res.json({ success: true });

  } catch (err) {
    console.error("❌ Erreur dans l'enregistrement :", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
*/