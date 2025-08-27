const express = require("express");
const router = express.Router();
const db = require("../db"); // ta connexion MySQL

// 📌 Ajouter un ami par pseudo ou email
router.post("/add", (req, res) => {
  const { userId, identifier } = req.body; // identifier = pseudo ou email

  if (!userId || !identifier) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Vérifier si l'ami existe
  db.query(
    "SELECT ID_Users FROM users WHERE Pseudo = ? OR Email = ?",
    [identifier, identifier],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });

      if (results.length === 0) {
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }

      const friendId = results[0].ID_Users;

      if (friendId === userId) {
        return res.status(400).json({ error: "Impossible de s'ajouter soi-même" });
      }

      // Vérifier si la relation existe déjà
      db.query(
        "SELECT * FROM friends WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)",
        [userId, friendId, friendId, userId],
        (err, rel) => {
          if (err) return res.status(500).json({ error: err });

          if (rel.length > 0) {
            return res.status(400).json({ error: "Relation déjà existante" });
          }

          // Créer la relation en pending
          db.query(
            "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')",
            [userId, friendId],
            (err, result) => {
              if (err) return res.status(500).json({ error: err });
              res.json({ message: "Demande d'ami envoyée", relationId: result.insertId });
            }
          );
        }
      );
    }
  );
});

// 📌 Accepter une demande d’ami
router.post("/accept", (req, res) => {
  const { userId, friendId } = req.body;

  db.query(
    "UPDATE friends SET status='accepted' WHERE user_id=? AND friend_id=? AND status='pending'",
    [friendId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.affectedRows === 0) {
        return res.status(400).json({ error: "Pas de demande en attente" });
      }
      res.json({ message: "Demande acceptée" });
    }
  );
});

// 📌 Liste des amis acceptés
router.get("/list/:userId", (req, res) => {
  const { userId } = req.params;

  db.query(
    `SELECT u.ID_Users, u.Pseudo, u.Email 
     FROM friends f 
     JOIN users u ON (u.ID_Users = f.friend_id)
     WHERE f.user_id=? AND f.status='accepted'
     UNION
     SELECT u.ID_Users, u.Pseudo, u.Email 
     FROM friends f 
     JOIN users u ON (u.ID_Users = f.user_id)
     WHERE f.friend_id=? AND f.status='accepted'`,
    [userId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

// 📌 Liste des demandes reçues (pending)
router.get("/requests/:userId", (req, res) => {
  const { userId } = req.params;

  db.query(
    `SELECT f.ID_Friends, u.ID_Users, u.Pseudo, u.Email
     FROM friends f
     JOIN users u ON u.ID_Users = f.user_id
     WHERE f.friend_id=? AND f.status='pending'`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
});

module.exports = router;
