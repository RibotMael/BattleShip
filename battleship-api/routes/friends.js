import express from "express";
import { query } from "../db.js";

const router = express.Router();

// Ajouter un ami par pseudo ou email
router.post("/add", async (req, res) => {
  const { userId, identifier } = req.body;
  console.log("[FRIENDS] POST /add", req.body);

  if (!userId || !identifier) {
    return res.status(400).json({ success: false, message: "Champs manquants" });
  }

  const identifierTrimmed = identifier.trim();

  try {
    // Recherche pseudo ou email 
    const [users] = await query(
      `SELECT ID_Users, Pseudo 
       FROM users 
       WHERE Pseudo LIKE ? OR Email LIKE ?`,
      [`%${identifierTrimmed}%`, `%${identifierTrimmed}%`]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }

    const friend = users[0];
    const friendId = friend.ID_Users;

    if (friendId === userId) {
      return res.status(400).json({ success: false, message: "Impossible de s'ajouter soi-même" });
    }

    // Vérifie qu’une relation n’existe pas déjà
    const [rel] = await query(
      `SELECT * 
       FROM friends 
       WHERE (Sender_ID=? AND Receiver_ID=?) OR (Sender_ID=? AND Receiver_ID=?)`,
      [userId, friendId, friendId, userId]
    );

    if (rel.length > 0) {
      return res.status(400).json({ success: false, message: "Relation déjà existante" });
    }

    // Ajoute la demande
    const [result] = await query(
      "INSERT INTO friends (Sender_ID, Receiver_ID, Status) VALUES (?, ?, 'Pending')",
      [userId, friendId]
    );

    console.log(`[FRIENDS] Invitation envoyée, ID: ${result.insertId}`);
    res.json({ 
      success: true, 
      message: "Demande d'ami envoyée", 
      relationId: result.insertId, 
      friend: { id: friendId, pseudo: friend.Pseudo } 
    });

  } catch (err) {
    console.error("Erreur SQL friends/add:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Accepter une demande
router.post("/accept", async (req, res) => {
  const { userId, friendId } = req.body;
  console.log("[FRIENDS] POST /accept", req.body);

  if (!userId || !friendId) return res.status(400).json({ success: false, message: "Champs manquants" });

  try {
    const [result] = await query(
      "UPDATE friends SET Status='Accepted' WHERE Sender_ID=? AND Receiver_ID=? AND Status='Pending'",
      [friendId, userId]
    );

    if (result.affectedRows === 0)
      return res.status(400).json({ success: false, message: "Pas de demande en attente" });

    console.log(`[FRIENDS] Demande acceptée entre ${friendId} -> ${userId}`);
    res.json({ success: true, message: "Demande acceptée", friendId });
  } catch (err) {
    console.error("Erreur SQL friends/accept:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Liste des amis acceptés
router.get("/list/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [results] = await query(
      `SELECT 
          u.ID_Users AS id,
          u.Pseudo AS pseudo,
          u.Online,
          a.Avatar AS avatar_blob,
          a.mime_type
       FROM friends f
       JOIN users u 
         ON (u.ID_Users = f.Sender_ID AND f.Receiver_ID = ?) 
         OR (u.ID_Users = f.Receiver_ID AND f.Sender_ID = ?)
       LEFT JOIN avatar a 
         ON u.Avatar = a.ID_Avatar
       WHERE f.Status='Accepted'`,
      [userId, userId]
    );

    const friends = results.map(r => ({
      ID_Users: r.id,
      Pseudo: r.pseudo,
      Avatar: r.avatar_blob
        ? r.avatar_blob.toString("base64")
        : null,
      mime_type: r.mime_type || "image/png",
      isOnline: r.Online === 1
    }));

    res.json(friends);
  } catch (err) {
    console.error("Erreur SQL friends/list:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Liste des demandes reçues
router.get("/requests/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [results] = await query(
      `SELECT 
          f.ID_Friends AS requestId,
          u.ID_Users AS id,
          u.Pseudo AS pseudo,
          u.Online,
          a.Avatar AS avatar_blob,
          a.mime_type
       FROM friends f
       JOIN users u ON u.ID_Users = f.Sender_ID
       LEFT JOIN avatar a 
         ON u.Avatar = a.ID_Avatar
       WHERE f.Receiver_ID=? AND f.Status='Pending'`,
      [userId]
    );

    const requests = results.map(r => ({
      requestId: r.requestId,
      ID_Users: r.id,
      Pseudo: r.pseudo,
      Avatar: r.avatar_blob
        ? r.avatar_blob.toString("base64")
        : null,
      mime_type: r.mime_type || "image/png",
      isOnline: r.Online === 1
    }));

    res.json(requests);
  } catch (err) {
    console.error("Erreur SQL friends/requests:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Supprimer un ami
router.post("/remove", async (req, res) => {
  const { userId, friendId } = req.body;
  console.log("[FRIENDS] POST /remove", req.body);

  if (!userId || !friendId) return res.status(400).json({ success: false, message: "Champs manquants" });

  try {
    const [result] = await query(
      "DELETE FROM friends WHERE (Sender_ID=? AND Receiver_ID=?) OR (Sender_ID=? AND Receiver_ID=?)",
      [userId, friendId, friendId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Relation introuvable" });

    console.log(`[FRIENDS] Relation supprimée entre ${userId} et ${friendId}`);
    res.json({ success: true, message: "Ami supprimé", friendId });
  } catch (err) {
    console.error("Erreur SQL friends/remove:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
