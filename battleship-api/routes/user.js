import { Router } from 'express';
import { query } from '../db.js';
import db from '../db.js';
import { computeLevel } from '../utils/levelHelpers.js';
import { io } from '../index.js';
import { requireAuth, requireSelf } from '../middleware/auth.js';

const router = Router();

router.get('/:id', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID invalide.' });

  const sql = `
    SELECT u.ID_Users, u.Email, u.Pseudo, u.BirthDay, u.niveau,
           a.Avatar AS avatar_blob, a.mime_type
    FROM users u
    LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
    WHERE u.ID_Users = ?
  `;

  try {
    const [rows] = await query(sql, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const user = rows[0];
    const isSelf = req.user.id === userId;

    let avatar = null;
    if (user.avatar_blob) {
      const base64 = Buffer.from(user.avatar_blob).toString('base64');
      avatar = `data:${user.mime_type};base64,${base64}`;
    }

    res.json({
      id: user.ID_Users,
      ...(isSelf ? { email: user.Email } : {}),
      pseudo: user.Pseudo,
      ...(isSelf ? { birthDay: user.BirthDay } : {}),
      niveau: user.niveau,
      avatar,
    });
  } catch (err) {
    console.error('[get-user]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.get('/:id/list', requireAuth, requireSelf, async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  try {
    const sql = `
      SELECT u.ID_Users AS id, u.Pseudo AS pseudo,
             a.Avatar AS avatar_blob, a.mime_type,
             u.Online AS isOnline
      FROM friends f
      JOIN users u
        ON (u.ID_Users = f.Sender_ID OR u.ID_Users = f.Receiver_ID)
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE (f.Sender_ID = ? OR f.Receiver_ID = ?)
        AND u.ID_Users != ?
        AND f.Status = 'Accepted'
    `;
    const [friends] = await query(sql, [userId, userId, userId]);

    const friendsWithAvatar = friends.map((f) => {
      let avatar = null;
      if (f.avatar_blob) {
        const base64 = Buffer.from(f.avatar_blob).toString('base64');
        avatar = `data:${f.mime_type || 'image/png'};base64,${base64}`;
      }
      return { id: f.id, pseudo: f.pseudo, avatar, isOnline: !!f.isOnline };
    });

    res.json({ success: true, friends: friendsWithAvatar });
  } catch (err) {
    console.error('[friends-list]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.put('/:id', requireAuth, requireSelf, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { pseudo, avatar, mimeType = 'image/png' } = req.body;

  if (!pseudo) return res.status(400).json({ message: 'Pseudo requis.' });

  if (pseudo.length < 3 || pseudo.length > 20)
    return res.status(400).json({ message: 'Le pseudo doit faire entre 3 et 20 caractères.' });
  if (!/^[a-zA-Z0-9_-]+$/.test(pseudo))
    return res.status(400).json({ message: 'Pseudo invalide (lettres, chiffres, _ et - uniquement).' });

  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  if (!allowedMimeTypes.includes(mimeType))
    return res.status(400).json({ message: 'Type de fichier non autorisé.' });

  try {
    const [[user]] = await query('SELECT Avatar FROM users WHERE ID_Users = ?', [userId]);
    const oldAvatarId = user?.Avatar || null;
    let newAvatarId = oldAvatarId;

    if (typeof avatar === 'number') {
      newAvatarId = avatar;
      await query('UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?', [
        pseudo.trim(), newAvatarId, userId,
      ]);
    } else if (avatar && typeof avatar === 'string') {
      if (avatar.length > 2_800_000)
        return res.status(400).json({ message: 'Image trop lourde (max 2 Mo).' });

      const buffer = Buffer.from(avatar, 'base64');
      const extension = mimeType.split('/')[1] || 'png';
      const avatarName = `user_${userId}_${Date.now()}.${extension}`;

      const [result] = await query(
        'INSERT INTO avatar (Avatar, Name, mime_type) VALUES (?, ?, ?)',
        [buffer, avatarName, mimeType]
      );
      newAvatarId = result.insertId;

      await query('UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?', [
        pseudo.trim(), newAvatarId, userId,
      ]);

      if (oldAvatarId && oldAvatarId > 18) {
        await query('DELETE FROM avatar WHERE ID_Avatar = ?', [oldAvatarId]);
      }
    } else {
      await query('UPDATE users SET Pseudo = ? WHERE ID_Users = ?', [pseudo.trim(), userId]);
    }

    const [rows] = await query(
      `SELECT u.ID_Users, u.Email, u.Pseudo, u.BirthDay, u.niveau,
              a.Avatar AS avatar_blob, a.mime_type, u.Avatar AS avatarId
       FROM users u
       LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
       WHERE u.ID_Users = ?`,
      [userId]
    );

    const updatedUser = rows[0];
    let avatarUrl = null;
    if (updatedUser.avatar_blob) {
      const base64 = Buffer.from(updatedUser.avatar_blob).toString('base64');
      avatarUrl = `data:${updatedUser.mime_type};base64,${base64}`;
    }

    res.json({
      id: updatedUser.ID_Users,
      email: updatedUser.Email,
      pseudo: updatedUser.Pseudo,
      birthDay: updatedUser.BirthDay,
      niveau: updatedUser.niveau,
      avatar: avatarUrl,
      avatarId: updatedUser.avatarId,
    });
  } catch (err) {
    console.error('[update-user]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/:id', requireAuth, requireSelf, async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  try {
    await db.query('UPDATE games SET winner_id = NULL WHERE winner_id = ?', [userId]);
    await db.query('UPDATE games SET id_creator = NULL WHERE id_creator = ?', [userId]);
    await db.query('DELETE FROM users WHERE ID_Users = ?', [userId]);

    io.to(`user_${userId}`).emit('account-deleted');
    res.json({ success: true, message: 'Utilisateur supprimé avec succès.' });
  } catch (err) {
    console.error('[delete-user]', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.get('/:id/stats', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ success: false });

  try {
    const [rows] = await db.query(
      `SELECT u.Gold, u.xp, u.niveau,
              r.Win, r.Defeat, r.Game_Played
       FROM users u
       LEFT JOIN ratio r ON u.ID_Users = r.ID_Profil
       WHERE u.ID_Users = ?`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ success: false });

    const s = rows[0];
    return res.json({
      success: true,
      gold: s.Gold,
      xp: s.xp,
      level: s.niveau,
      win: s.Win || 0,
      defeat: s.Defeat || 0,
      game_played: s.Game_Played || 0,
    });
  } catch (err) {
    console.error('[stats]', err.message);
    return res.status(500).json({ success: false });
  }
});

function requireInternalSecret(req, res, next) {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_SECRET)
    return res.status(403).json({ success: false, message: 'Accès interdit.' });
  next();
}

router.post('/:id/reward', requireAuth, async (req, res) => {
  const playerId = parseInt(req.params.id, 10);
  const { isVictory, gameId } = req.body;

  if (isNaN(playerId) || typeof isVictory !== 'boolean' || !gameId)
    return res.status(400).json({ success: false, message: 'Paramètres invalides.' });

  try {
    const [[game]] = await db.query(
      `SELECT g.status, g.winner_id
       FROM games g
       JOIN game_players gp ON g.id_Game = gp.id_game AND gp.id_player = ?
       WHERE g.id_Game = ?`,
      [playerId, gameId]
    );

    if (!game)
      return res.status(404).json({ success: false, message: 'Partie ou joueur introuvable.' });

    if (game.status !== 'finished')
      return res.status(400).json({ success: false, message: 'La partie n\'est pas terminée.' });

    const baseGold = isVictory ? 100 : 25;
    const xpGain   = isVictory ? 50  : 25;

    const [rows] = await db.query(
      'SELECT Gold, xp FROM users WHERE ID_Users = ?',
      [playerId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Joueur introuvable.' });

    const { Gold: currentGold, xp: currentXp } = rows[0];
    const lvlBefore    = computeLevel(currentXp);
    const newXp        = currentXp + xpGain;
    const lvlAfter     = computeLevel(newXp);
    const levelsGained = lvlAfter.level - lvlBefore.level;
    const levelUpGold  = levelsGained * 200;
    const totalGold    = baseGold + levelUpGold;
    const newGold      = currentGold + totalGold;

    function computeXpIntoLevel(xp) {
      let level = 0, used = 0;
      while (true) {
        const needed = Math.floor(100 * Math.pow(1.02, level));
        if (used + needed > xp) return { xpIntoLevel: xp - used, xpNeededForNext: needed };
        used += needed;
        level++;
      }
    }
    const xpProgress = computeXpIntoLevel(newXp);
    const xpIntoLevel     = lvlAfter.xpIntoLevel     ?? xpProgress.xpIntoLevel;
    const xpNeededForNext = lvlAfter.xpNeededForNext  ?? xpProgress.xpNeededForNext;

    await db.query(
      'UPDATE users SET Gold = ?, xp = ?, niveau = ? WHERE ID_Users = ?',
      [newGold, newXp, lvlAfter.level, playerId]
    );

    await db.query(
      'INSERT IGNORE INTO ratio (ID_Profil, Win, Defeat, Game_Played) VALUES (?, 0, 0, 0)',
      [playerId]
    );

    if (isVictory) {
      await db.query(
        'UPDATE ratio SET Win = Win + 1, Game_Played = Game_Played + 1 WHERE ID_Profil = ?',
        [playerId]
      );
    } else {
      await db.query(
        'UPDATE ratio SET Defeat = Defeat + 1, Game_Played = Game_Played + 1 WHERE ID_Profil = ?',
        [playerId]
      );
    }

    return res.json({
      success:         true,
      goldGain:        totalGold,
      baseGoldGain:    baseGold,
      levelUpGoldGain: levelUpGold,
      xpGain,
      levelsGained,
      newGold,
      newXp,
      newLevel:        lvlAfter.level,
      xpIntoLevel,
      xpNeededForNext,
      levelUp:         levelsGained > 0,
      levelUpTo:       levelsGained > 0 ? lvlAfter.level : null,
    });
  } catch (err) {
    console.error('[reward]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;