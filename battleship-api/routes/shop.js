import express from "express";
import db from "../db.js";

const router = express.Router();

// 1. Récupérer l'arsenal (Items + Achats du joueur + Or/Thème actif)
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // Tous les items de la boutique
    const [items] = await db.query("SELECT * FROM shop_items ORDER BY sort_order");
    
    // Les achats du joueur
    const [purchases] = await db.query("SELECT item_id FROM user_purchases WHERE user_id = ?", [userId]);
    
    // Les infos actuelles du joueur
    const [user] = await db.query("SELECT active_theme, Gold FROM users WHERE ID_Users = ?", [userId]);

    if (!user.length) {
      return res.status(404).json({ success: false, message: "Joueur introuvable" });
    }

    res.json({
      success: true,
      items,
      ownedItemIds: purchases.map(p => p.item_id),
      activeTheme: user[0].active_theme,
      gold: user[0].Gold
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Acheter un item (Transaction sécurisée)
router.post("/buy", async (req, res) => {
  const { userId, itemId } = req.body;
  try {
    const [itemRes] = await db.query("SELECT price, name FROM shop_items WHERE id = ?", [itemId]);
    const [userRes] = await db.query("SELECT Gold FROM users WHERE ID_Users = ?", [userId]);

    if (!itemRes.length || !userRes.length) {
      return res.status(400).json({ success: false, message: "Erreur de données" });
    }

    const price = itemRes[0].price;
    const currentGold = userRes[0].Gold;

    if (currentGold < price) {
      return res.status(400).json({ success: false, message: "Fonds insuffisants !" });
    }

    // Début de la transaction
    await db.query("START TRANSACTION");
    
    // Déduire l'or
    await db.query("UPDATE users SET Gold = Gold - ? WHERE ID_Users = ?", [price, userId]);
    
    // Enregistrer l'achat
    await db.query("INSERT INTO user_purchases (user_id, item_id) VALUES (?, ?)", [userId, itemId]);
    
    // Valider la transaction
    await db.query("COMMIT");

    res.json({ success: true, newGold: currentGold - price });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
});

// 3. Équiper un thème
router.post("/equip", async (req, res) => {
  const { userId, slug } = req.body;
  try {
    await db.query("UPDATE users SET active_theme = ? WHERE ID_Users = ?", [slug, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;