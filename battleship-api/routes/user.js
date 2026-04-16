// battleship-api/routes/user.js
import { Router } from 'express';
import { query } from '../db.js';
import db from "../db.js";
import { computeLevel } from "../utils/levelHelpers.js"


const router = Router();

// Récupérer un utilisateur avec son avatar
router.get('/:id', async (req, res) => {
  const userId = req.params.id;
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
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = rows[0];
    let avatar = null;
    if (user.avatar_blob) {
      const base64 = Buffer.from(user.avatar_blob).toString('base64');
      avatar = `data:${user.mime_type};base64,${base64}`;
    }

    res.json({
      id: user.ID_Users,
      email: user.Email,
      pseudo: user.Pseudo,
      birthDay: user.BirthDay,
      niveau: user.niveau,
      avatar
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Récupérer la liste des amis
router.get('/:id/list', async (req, res) => {
  const userId = req.params.id;

  try {
    const sql = `
      SELECT u.ID_Users AS id, u.Pseudo AS pseudo, a.Avatar AS avatar_blob, u.Online AS isOnline
      FROM friends f
      JOIN users u 
        ON (u.ID_Users = f.Sender_ID OR u.ID_Users = f.Receiver_ID)
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE (f.Sender_ID = ? OR f.Receiver_ID = ?) 
        AND u.ID_Users != ?
    `;
    const [friends] = await query(sql, [userId, userId, userId]);

    // Transformer les avatars en base64
    const friendsWithAvatar = friends.map(f => {
      let avatar = null;
      if (f.avatar_blob) {
        const base64 = Buffer.from(f.avatar_blob).toString('base64');
        avatar = `data:image/png;base64,${base64}`;
      }
      return {
        id: f.id,
        pseudo: f.pseudo,
        avatar,
        isOnline: !!f.isOnline,
        niveau: f.niveau ?? 0,
      };
    });

    res.json({ success: true, friends: friendsWithAvatar });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Modifier pseudo + avatar
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { pseudo, avatar, mimeType = "image/png" } = req.body;

  if (!pseudo) return res.status(400).json({ message: "Pseudo requis." });

  try {
    let newAvatarId = null;

    // Vérifier l'avatar actuel
    const [[user]] = await query("SELECT Avatar FROM users WHERE ID_Users = ?", [userId]);
    const oldAvatarId = user?.Avatar || null;

    // avatar est un nombre (ID_Avatar existant en BDD)
    if (typeof avatar === "number") {
      newAvatarId = avatar;

      // Update uniquement le lien
      await query("UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?", [pseudo, newAvatarId, userId]);

    //  avatar est une chaîne base64 : upload 
    } else if (avatar && typeof avatar === "string") {
      const buffer = Buffer.from(avatar, 'base64');
      const extension = mimeType.split('/')[1] || 'png';
      const avatarName = `user_${userId}_${Date.now()}.${extension}`;

      const insertSql = "INSERT INTO avatar (Avatar, Name, mime_type) VALUES (?, ?, ?)";
      const [result] = await query(insertSql, [buffer, avatarName, mimeType]);
      newAvatarId = result.insertId;

      // Mise à jour du user
      await query("UPDATE users SET Pseudo = ?, Avatar = ? WHERE ID_Users = ?", [pseudo, newAvatarId, userId]);

      // Supprimer l’ancien avatar seulement si c'était un upload perso 
      if (oldAvatarId) {
        await query("DELETE FROM avatar WHERE ID_Avatar = ?", [oldAvatarId]);
      }

    // pas d’avatar, juste pseudo
    } else {
      await query("UPDATE users SET Pseudo = ? WHERE ID_Users = ?", [pseudo, userId]);
      newAvatarId = oldAvatarId;
    }

    // Récupérer l’utilisateur mis à jour
    const [rows] = await query(`
      SELECT u.ID_Users, u.Email, u.Pseudo, u.BirthDay, u.niveau,
             a.Avatar AS avatar_blob, a.mime_type, u.Avatar AS avatarId
      FROM users u
      LEFT JOIN avatar a ON u.Avatar = a.ID_Avatar
      WHERE u.ID_Users = ?
    `, [userId]);

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
      avatarId: updatedUser.avatarId 
    });

  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Supprimer un utilisateur 
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {

    // Supprime le compte utilisateur
    await db.query("DELETE FROM users WHERE ID_Users = ?", [userId]);

    res.json({ success: true, message: "Utilisateur supprimé avec succès." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

router.get('/:id/stats', async (req, res) => {
  const userId = parseInt(req.params.id);
  if (!userId) return res.status(400).json({ success: false });

  try {
    // ON JOINT LES DEUX TABLES
    const [rows] = await db.query(
      `SELECT u.Gold, u.xp, u.niveau, r.Win, r.Defeat, r.Game_Played 
       FROM users u 
       LEFT JOIN ratio r ON u.ID_Users = r.ID_Profil 
       WHERE u.ID_Users = ?`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ success: false });

    const stats = rows[0];

    return res.json({
      success: true,
      gold: stats.Gold,
      xp: stats.xp,
      level: stats.niveau,
      // On renvoie les stats de la table ratio
      win: stats.Win || 0,
      defeat: stats.Defeat || 0,
      game_played: stats.Game_Played || 0
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

// Vérifie si un utilisateur existe encore
router.get("/check-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await query("SELECT ID_Users FROM users WHERE ID_Users = ?", [id]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Utilisateur supprimé ou inexistant" });
    }

    res.json({ success: true, message: "Utilisateur valide" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.post("/:id/reward", async (req, res) => {
  const playerId  = parseInt(req.params.id);
  const { isVictory, gameId } = req.body;
 
  if (!playerId || typeof isVictory !== "boolean") {
    return res.status(400).json({ success: false, message: "Paramètres invalides." });
  }
 
  const baseGold = isVictory ? 100 : 25;
  const xpGain   = isVictory ? 50  : 25;
 
  try {
    const [rows] = await db.query(
      "SELECT Gold, xp, niveau FROM users WHERE ID_Users = ?",
      [playerId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Joueur introuvable." });
 
    const { Gold: currentGold, xp: currentXp } = rows[0];
 
    const lvlBefore   = computeLevel(currentXp);
    const newXp       = currentXp + xpGain;
    const lvlAfter    = computeLevel(newXp);
    const levelsGained = lvlAfter.level - lvlBefore.level;
    const levelUpGold  = levelsGained * 200;   // +200 gold par niveau gagné
    const totalGold    = baseGold + levelUpGold;
    const newGold      = currentGold + totalGold;
 
    await db.query(
      "UPDATE users SET Gold = ?, xp = ?, niveau = ? WHERE ID_Users = ?",
      [newGold, newXp, lvlAfter.level, playerId]
    );

    await db.query(
      "INSERT IGNORE INTO ratio (ID_Profil, Win, Defeat, Game_Played) VALUES (?, 0, 0, 0)",
      [playerId]
    );
 
    const ratioField = isVictory ? "Win" : "Defeat";
    await db.query(
      `UPDATE ratio SET ${ratioField} = ${ratioField} + 1, Game_Played = Game_Played + 1 WHERE ID_Profil = ?`,
      [playerId]
    );
 
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
      xpIntoLevel:     lvlAfter.xpIntoLevel,
      xpNeededForNext: lvlAfter.xpNeededForNext,
      levelUp:         levelsGained > 0,
      levelUpTo:       levelsGained > 0 ? lvlAfter.level : null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Erreur serveur." });
  }
});


export default router;
