// routes/checkPseudo.js
import express from 'express';
import db from '../db.js'; 

const router = express.Router();

router.post('/api/check-pseudo', async (req, res) => {
  const { pseudo } = req.body;

  if (!pseudo || typeof pseudo !== 'string') {
    return res.status(400).json({ available: false, message: "Pseudo invalide." });
  }

  try {
    const [rows] = await db.execute('SELECT ID_Users FROM users WHERE pseudo = ?', [pseudo]);
    res.json({ available: rows.length === 0 });
  } catch (error) {
    console.error("Erreur vérification pseudo :", error);
    res.status(500).json({ available: false, message: "Erreur serveur." });
  }
});

export default router;
