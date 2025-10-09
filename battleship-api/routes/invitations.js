//invitation.js
import express from "express";
import {
  sendInviteToDB,
  getInvitationsForUserFromDB,
  removeInvitationFromDB,
  respondInviteDB
} from "../stores/invitationStore.js";

const router = express.Router();

// Envoyer une invitation
router.post("/", async (req, res) => {
  const { gameId, senderId, receiverId } = req.body;
  if (!gameId || !senderId || !receiverId) {
    return res.json({ success: false, message: "Paramètres manquants" });
  }

  try {
    const inviteId = await sendInviteToDB({ gameId, senderId, receiverId });
    res.json({ success: true, inviteId });
  } catch (err) {
    res.json({ success: false, message: "Erreur serveur" });
  }
});

// Récupérer les invitations d'un utilisateur
router.get("/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  try {
    const invitations = await getInvitationsForUserFromDB(userId);
    res.json({ success: true, invitations });
  } catch (err) {
    res.json({ success: false, message: "Erreur serveur" });
  }
});

// Supprimer une invitation (ex: après rejet ou annulation)
router.post("/remove", async (req, res) => {
  const { inviteId } = req.body;
  try {
    await removeInvitationFromDB(inviteId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Erreur serveur" });
  }
});

// Répondre à une invitation (accept/reject)
router.post("/respond", async (req, res) => {
  const { inviteId, accept, userId } = req.body;
  if (!inviteId || accept === undefined || !userId) return res.json({ success: false, message: "Paramètres manquants" });

  try {
    const result = await respondInviteDB(inviteId, accept, userId);
    res.json({ success: true, result });
  } catch(err) {
    res.json({ success: false, message: err.message });
  }
});

export default router;
