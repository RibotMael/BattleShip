// battleship-api/routes/auth.js
import { Router } from 'express';
import { query } from '../db.js';
import bcryptjs from 'bcryptjs';
const router = Router();

// -------------------- INSCRIPTION --------------------
router.post('/register', async (req, res) => {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  if (!email || !password || !pseudo || !birthDay || !avatar) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  try {
    const [existingEmails] = await query("SELECT ID_Users FROM users WHERE Email = ?", [email]);
    if (existingEmails.length > 0) return res.status(409).json({ success: false, message: "Email déjà utilisé." });

    const [existingPseudos] = await query("SELECT ID_Users FROM users WHERE Pseudo = ?", [pseudo]);
    if (existingPseudos.length > 0) return res.status(409).json({ success: false, message: "Pseudo déjà utilisé." });

    const hashedPassword = await bcryptjs.hash(password, 10);

    //On garde juste l'ID de l'avatar
    const avatarId = avatar;

    const insertUserSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau, Online, Gold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(insertUserSql, [email, hashedPassword, pseudo, birthDay, avatarId, 1, 0, 0]);

    return res.json({ success: true, user: { id: result.insertId, pseudo, avatar: avatarId } });
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
    const isPasswordValid = await bcryptjs.compare(password, user.Password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Mot de passe incorrect" });

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

// -------------------- CHECK USER --------------------
router.get('/check-user/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await query("SELECT ID_Users FROM users WHERE ID_Users = ?", [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Compte supprimé" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur check-user:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});


export default router;
