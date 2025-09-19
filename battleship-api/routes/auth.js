// battleship-api/routes/auth.js
import { Router } from 'express';
import { query } from '../db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();

// -------------------- INSCRIPTION --------------------
router.post('/register', async (req, res) => {
  const { email, password, pseudo, birthDay, avatar, mimeType } = req.body;

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  try {
    // Vérifier si email ou pseudo existent déjà
    const [existingEmails] = await query("SELECT ID_Users FROM users WHERE Email = ?", [email]);
    if (existingEmails.length > 0) return res.status(409).json({ success: false, message: "Email déjà utilisé." });

    const [existingPseudos] = await query("SELECT ID_Users FROM users WHERE Pseudo = ?", [pseudo]);
    if (existingPseudos.length > 0) return res.status(409).json({ success: false, message: "Pseudo déjà utilisé." });

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserer l'avatar dans la table avatar
    const avatarBuffer = Buffer.from(avatar, 'base64');
    const mime = mimeType || "image/png";
    const name = "avatar_" + crypto.randomBytes(6).toString("hex");
    const insertAvatarSql = `INSERT INTO avatar (Avatar, mime_type, Name) VALUES (?, ?, ?)`;
    const avatarResult = await query(insertAvatarSql, [avatarBuffer, mime, name]);
    const avatarId = avatarResult.insertId;

    // Inserer l'utilisateur avec Avatar = avatarId
    const insertUserSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau, Online, Gold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(insertUserSql, [email, hashedPassword, pseudo, birthDay, avatarId, 1, 0, 0]);

    const avatarBase64 = `data:${mime};base64,${avatar}`;
    return res.json({ success: true, user: { id: result.insertId, pseudo, avatar: avatarBase64 } });
  } catch (err) {
    console.error("Erreur d'inscription:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// -------------------- CONNEXION --------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email et mot de passe requis" });

  try {
    const sql = `
      SELECT u.ID_Users, u.Email, u.Pseudo, u.niveau, u.Password,
             u.Avatar AS AvatarID, a.Avatar, a.mime_type
      FROM users u
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE u.Email = ?
    `;
    const [results] = await query(sql, [email]);
    if (results.length === 0) return res.status(401).json({ success: false, message: "Email non trouvé" });

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Mot de passe incorrect" });

    // Mettre Online = 1
    await query("UPDATE users SET Online = 1 WHERE ID_Users = ?", [user.ID_Users]);

    const avatarBase64 = user.Avatar ? `data:${user.mime_type};base64,${user.Avatar.toString("base64")}` : null;

    return res.json({
      success: true,
      user: {
        id: user.ID_Users,
        email: user.Email,
        pseudo: user.Pseudo,
        niveau: user.niveau,
        avatar: avatarBase64,
        online: 1
      }
    });
  } catch (err) {
    console.error("Erreur login:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// -------------------- DECONNEXION --------------------
router.post('/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "ID utilisateur requis" });

  try {
    await query("UPDATE users SET Online = 0 WHERE ID_Users = ?", [userId]);
    return res.json({ success: true, message: "Déconnecté avec succès" });
  } catch (err) {
    console.error("Erreur logout:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// -------------------- MISE À JOUR PROFIL --------------------
router.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { pseudo, avatar, mimeType } = req.body;

  try {
    let avatarId = null;

    if (avatar && avatar.trim() !== '') {
      const avatarBuffer = Buffer.from(avatar, 'base64');
      const mime = mimeType || "image/png";
      const name = "avatar_" + crypto.randomBytes(6).toString("hex");

      const insertAvatarSql = `INSERT INTO avatar (Avatar, mime_type, Name) VALUES (?, ?, ?)`;
      const avatarResult = await query(insertAvatarSql, [avatarBuffer, mime, name]);
      avatarId = avatarResult.insertId;
    }

    if (avatarId) {
      await query(`UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?`, [pseudo, avatarId, userId]);
    } else {
      await query(`UPDATE users SET Pseudo = ? WHERE ID_Users = ?`, [pseudo, userId]);
    }

    const [rows] = await query(
      `SELECT u.ID_Users, u.Pseudo, a.Avatar, a.mime_type
       FROM users u
       LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
       WHERE u.ID_Users = ?`,
      [userId]
    );
    const updatedUser = rows[0];
    const avatarBase64 = updatedUser.Avatar
      ? `data:${updatedUser.mime_type};base64,${updatedUser.Avatar.toString("base64")}`
      : null;

    res.json({
      id: updatedUser.ID_Users,
      pseudo: updatedUser.Pseudo,
      avatar: avatarBase64
    });
  } catch (err) {
    console.error("Erreur update profil:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// -------------------- GET USER --------------------
router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await query(`
      SELECT u.ID_Users, u.Pseudo, a.Avatar, a.mime_type
      FROM users u
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE u.ID_Users = ?
    `, [userId]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });

    const user = rows[0];
    const avatarBase64 = user.Avatar ? `data:${user.mime_type};base64,${user.Avatar.toString("base64")}` : null;

    res.json({
      success: true,
      user: {
        id: user.ID_Users,
        pseudo: user.Pseudo,
        avatar: avatarBase64
      }
    });
  } catch (err) {
    console.error("Erreur GET user:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
