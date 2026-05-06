import { Router } from 'express';
import { query } from '../db.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── Rate limiting ──────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes.' },
  validate: { xForwardedForHeader: false },
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user.ID_Users, email: user.Email, pseudo: user.Pseudo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── INSCRIPTION ────────────────────────────────────────────────────────────────
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  const { email, password, pseudo, birthDay, avatar } = req.body;

  try {
    const [existingEmails] = await query(
      'SELECT ID_Users FROM users WHERE Email = ?',
      [email.toLowerCase().trim()]
    );
    if (existingEmails.length > 0) {
      return res.status(409).json({ success: false, message: 'Email déjà utilisé.' });
    }

    const [existingPseudos] = await query(
      'SELECT ID_Users FROM users WHERE Pseudo = ?',
      [pseudo.trim()]
    );
    if (existingPseudos.length > 0) {
      return res.status(409).json({ success: false, message: 'Pseudo déjà utilisé.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 12);

    const insertUserSql = `
      INSERT INTO users (Email, Password, Pseudo, BirthDay, Avatar, niveau, Online, Gold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // query() retourne [result, fields] pour un INSERT
    const [result] = await query(insertUserSql, [
      email.toLowerCase().trim(),
      hashedPassword,
      pseudo.trim(),
      birthDay,
      avatar,
      1,
      0,
      0,
    ]);

    // Insérer une entrée ratio pour le nouvel utilisateur
    await query(
      'INSERT IGNORE INTO ratio (ID_Profil, Win, Defeat, Game_Played) VALUES (?, 0, 0, 0)',
      [result.insertId]
    );

    const newUser = { ID_Users: result.insertId, Email: email, Pseudo: pseudo };
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: result.insertId,
        pseudo: pseudo.trim(),
        avatar,
        niveau: 1,
        xp: 0,
        gold: 0,
      },
    });
  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── CONNEXION ──────────────────────────────────────────────────────────────────
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    const sql = `
      SELECT u.ID_Users, u.Email, u.Pseudo, u.niveau, u.Password, u.xp, u.Gold,
             u.Avatar AS AvatarID, a.Avatar, a.mime_type
      FROM users u
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE u.Email = ?
    `;
    const [results] = await query(sql, [email.toLowerCase().trim()]);

    // Message générique pour ne pas indiquer si l'email existe
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    const user = results[0];
    const isPasswordValid = await bcryptjs.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    await query('UPDATE users SET Online = 1 WHERE ID_Users = ?', [user.ID_Users]);

    const avatarBase64 = user.Avatar
      ? `data:${user.mime_type};base64,${user.Avatar.toString('base64')}`
      : null;

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.ID_Users,
        email: user.Email,
        pseudo: user.Pseudo,
        niveau: user.niveau,
        xp: user.xp,
        gold: user.Gold,
        avatar: avatarBase64,
        avatarId: user.AvatarID,
        online: 1,
      },
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── DÉCONNEXION ────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await query('UPDATE users SET Online = 0 WHERE ID_Users = ?', [req.user.id]);
    return res.json({ success: true, message: 'Déconnecté avec succès.' });
  } catch (err) {
    console.error('[logout]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── GET USER (public, utilisé par d'autres joueurs) ───────────────────────────
router.get('/users/:id', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'ID invalide.' });
  }

  try {
    const [rows] = await query(
      `SELECT u.ID_Users, u.Pseudo, a.Avatar, a.mime_type
       FROM users u
       LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
       WHERE u.ID_Users = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const user = rows[0];
    const avatarBase64 = user.Avatar
      ? `data:${user.mime_type};base64,${user.Avatar.toString('base64')}`
      : null;

    res.json({
      success: true,
      user: { id: user.ID_Users, pseudo: user.Pseudo, avatar: avatarBase64 },
    });
  } catch (err) {
    console.error('[get-user]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── CHECK USER ─────────────────────────────────────────────────────────────────
// Route protégée par token pour éviter l'énumération d'IDs
router.get('/check-user/:id', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'ID invalide.' });
  }

  // Un utilisateur ne peut vérifier que son propre compte
  if (req.user.id !== userId) {
    return res.status(403).json({ success: false, message: 'Accès interdit.' });
  }

  try {
    const [rows] = await query('SELECT ID_Users FROM users WHERE ID_Users = ?', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Compte supprimé.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[check-user]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;