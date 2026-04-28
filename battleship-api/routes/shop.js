import express from "express";
import db from "../db.js";

const router = express.Router();

// 1. Récupérer l'arsenal (Skins + Achats + Actifs + Or)
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    // Tous les items de la boutique
    const [items] = await db.query("SELECT * FROM skin_themes");
    
    // Les achats du joueur
    const [purchases] = await db.query("SELECT id_theme FROM skin_purchases WHERE id_user = ?", [userId]);
    
    // Ce que le joueur a d'équipé
    const [actives] = await db.query("SELECT category, id_theme FROM skin_active WHERE id_user = ?", [userId]);
    
    // L'or actuel du joueur
    const [user] = await db.query("SELECT Gold FROM users WHERE ID_Users = ?", [userId]);

    if (!user.length) {
      return res.status(404).json({ success: false, message: "Joueur introuvable" });
    }

    // On formate les actifs pour le frontend { avatar: 1, bateau: null, fond: null }
    const activeIds = { avatar: null, bateau: null, fond: null };
    actives.forEach(row => {
      activeIds[row.category] = row.id_theme;
    });

    res.json({
      success: true,
      items,
      ownedIds: purchases.map(p => p.id_theme),
      activeIds: activeIds,
      gold: user[0].Gold
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Acheter un skin
router.post("/buy", async (req, res) => {
  const { userId, skinId } = req.body;
  try {
    const [itemRes] = await db.query("SELECT price FROM skin_themes WHERE id = ?", [skinId]);
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
    await db.query("INSERT INTO skin_purchases (id_user, id_theme) VALUES (?, ?)", [userId, skinId]);
    
    // Valider la transaction
    await db.query("COMMIT");

    res.json({ success: true, newGold: currentGold - price });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ success: false, message: "Erreur serveur", error: err.message });
  }
});

// 3. Équiper un skin
router.post("/equip", async (req, res) => {
  const { userId, skinId, category } = req.body;
  try {
    // Si skinId est 0 ou null → on revient au skin par défaut = supprimer la ligne
    if (!skinId || skinId === 0) {
      await db.query(
        "DELETE FROM skin_active WHERE id_user = ? AND category = ?",
        [userId, category]
      );
      return res.json({ success: true });
    }

    // Vérifier que le skin existe bien dans skin_themes avant d'insérer
    const [skinCheck] = await db.query(
      "SELECT id FROM skin_themes WHERE id = ?",
      [skinId]
    );
    if (!skinCheck.length) {
      return res.status(400).json({ success: false, message: "Skin introuvable" });
    }

    await db.query(
      `INSERT INTO skin_active (id_user, category, id_theme) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE id_theme = VALUES(id_theme)`,
      [userId, category, skinId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur equip:", err.message); // pour déboguer côté serveur
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;