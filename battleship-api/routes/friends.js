// battleship-api/routes/friends.js

import express from "express";
import { query } from "../db.js";

const router = express.Router();

// Ajouter un ami par pseudo ou email
router.post("/add", async (req, res) => {
  const { userId, identifier } = req.body;
  if (!userId || !identifier) return res.status(400).json({ error: "Champs manquants" });

  try {
    // Trouver l'utilisateur par pseudo ou email
    const [users] = await query(
      "SELECT ID_Users, Pseudo FROM users WHERE Pseudo = ? OR Email = ?",
      [identifier, identifier]
    );
    if (users.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });

    const friendId = users[0].ID_Users;
    if (friendId === userId) return res.status(400).json({ error: "Impossible de s'ajouter soi-même" });

    // Vérifier si relation existante
    const [rel] = await query(
      "SELECT * FROM friends WHERE (Sender_ID=? AND Receiver_ID=?) OR (Sender_ID=? AND Receiver_ID=?)",
      [userId, friendId, friendId, userId]
    );
    if (rel.length > 0) return res.status(400).json({ error: "Relation déjà existante" });

    // Créer la demande d'ami
    const [result] = await query(
      "INSERT INTO friends (Sender_ID, Receiver_ID, Status) VALUES (?, ?, 'Pending')",
      [userId, friendId]
    );

    res.json({ message: "Demande d'ami envoyée", relationId: result.insertId, friend: { id: friendId, pseudo: users[0].Pseudo } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accepter une demande
router.post("/accept", async (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: "Champs manquants" });

  try {
    const [result] = await query(
      "UPDATE friends SET Status='Accepted' WHERE Sender_ID=? AND Receiver_ID=? AND Status='Pending'",
      [friendId, userId]
    );

    if (result.affectedRows === 0) return res.status(400).json({ error: "Pas de demande en attente" });
    res.json({ message: "Demande acceptée", friendId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des amis acceptés avec avatar + Online
router.get("/list/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [results] = await query(
      `SELECT u.ID_Users AS id, u.Pseudo AS pseudo, u.Online, a.Avatar
       FROM friends f
       JOIN users u ON u.ID_Users = f.Receiver_ID
       LEFT JOIN profil p ON p.ID_Users = u.ID_Users
       LEFT JOIN avatar a ON a.ID_Avatar = p.ID_Avatar
       WHERE f.Sender_ID=? AND f.Status='Accepted'
       UNION
       SELECT u.ID_Users AS id, u.Pseudo AS pseudo, u.Online, a.Avatar
       FROM friends f
       JOIN users u ON u.ID_Users = f.Sender_ID
       LEFT JOIN profil p ON p.ID_Users = u.ID_Users
       LEFT JOIN avatar a ON a.ID_Avatar = p.ID_Avatar
       WHERE f.Receiver_ID=? AND f.Status='Accepted'`,
      [userId, userId]
    );

    const friends = results.map(f => ({
      id: f.id,
      pseudo: f.pseudo,
      avatar: f.Avatar ? `data:image/png;base64,${f.Avatar}` : null,
      isOnline: f.Online === 1 // ✅ conversion en booléen
    }));

    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste des demandes reçues avec avatar + Online
router.get("/requests/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [results] = await query(
      `SELECT f.ID_Friends AS requestId, u.ID_Users AS id, u.Pseudo AS pseudo, u.Online, a.Avatar
       FROM friends f
       JOIN users u ON u.ID_Users = f.Sender_ID
       LEFT JOIN profil p ON p.ID_Users = u.ID_Users
       LEFT JOIN avatar a ON a.ID_Avatar = p.ID_Avatar
       WHERE f.Receiver_ID=? AND f.Status='Pending'`,
      [userId]
    );

    const requests = results.map(r => ({
      requestId: r.requestId,
      id: r.id,
      pseudo: r.pseudo,
      avatar: r.Avatar ? `data:image/png;base64,${r.Avatar}` : null,
      isOnline: r.Online === 1 // ✅ conversion en booléen
    }));

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un ami
router.post("/remove", async (req, res) => {
  const { userId, friendId } = req.body;
  if (!userId || !friendId) return res.status(400).json({ error: "Champs manquants" });

  try {
    const [result] = await query(
      "DELETE FROM friends WHERE (Sender_ID=? AND Receiver_ID=?) OR (Sender_ID=? AND Receiver_ID=?)",
      [userId, friendId, friendId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Relation introuvable" });
    res.json({ message: "Ami supprimé", friendId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
