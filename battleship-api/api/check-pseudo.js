// battleship-api/api/check-pseudo.js

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/check-pseudo', (req, res) => {
  const { pseudo } = req.body;

  if (!pseudo) {
    return res.status(400).json({ success: false, message: "Pseudo requis" });
  }

  const sql = 'SELECT ID_Users FROM users WHERE Pseudo = ?';
  query(sql, [pseudo], (err, results) => {
    if (err) {
      console.error("Erreur vérification pseudo:", err);
      return res.status(500).json({ success: false, message: "Erreur serveur" });
    }

    return res.json({ available: results.length === 0 });
  });
});

export default router;
