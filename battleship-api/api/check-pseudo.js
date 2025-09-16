// battleship-api/api/check-pseudo.js

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.post('/check-pseudo', async (req, res) => {
  const { pseudo } = req.body;

  if (!pseudo) {
    return res.status(400).json({ success: false, message: "Pseudo requis" });
  }

  try {
    const sql = 'SELECT ID_Users FROM users WHERE Pseudo = ?';
    const [results] = await query(sql, [pseudo]);

    return res.json({ available: results.length === 0 });
  } catch (err) {
    console.error("Erreur vérification pseudo:", err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
