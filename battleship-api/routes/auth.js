// battleship-api/routes/auth.js
import { Router } from 'express';
import { query } from '../db.js';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  try {
    // Vérifier email
    const [existingEmails] = await query("SELECT ID_Users FROM users WHERE Email = ?", [email]);
    if (existingEmails.length > 0) {
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }

    // Vérifier pseudo
    const [existingPseudos] = await query("SELECT ID_Users FROM users WHERE Pseudo = ?", [pseudo]);
    if (existingPseudos.length > 0) {
      return res.status(409).json({ success: false, message: "Pseudo déjà utilisé." });
    }

    // Hasher mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Avatar base64 => buffer
    const avatarBuffer = Buffer.from(avatar, 'base64');

    // Insertion
    const insertSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(insertSql, [email, hashedPassword, pseudo, birthDay, avatarBuffer, 1]);

    return res.json({ success: true });

  } catch (err) {
    console.error("Erreur d'inscription:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email et mot de passe requis" });
  }

  try {
    const sql = "SELECT ID_Users, Email, Pseudo, niveau, Avatar, Password FROM users WHERE Email = ?";
    const [results] = await query(sql, [email]);

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: "Email non trouvé" });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Mot de passe incorrect" });
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
