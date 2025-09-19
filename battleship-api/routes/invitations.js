//routes/invitation.js

import express from 'express';
import { sendInvite, getInvitationsForUser, removeInvitation } from '../stores/invitationStore.js';

const router = express.Router();

// Récupérer toutes les invitations pour un utilisateur
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const invitations = getInvitationsForUser(userId);
  res.json({ invitations });
});

// Envoyer une invitation
router.post('/send', (req, res) => {
  const invite = req.body; // { gameId, fromId, toId, senderPseudo }
  sendInvite(invite);
  res.json({ success: true });
});

// Supprimer une invitation (acceptée ou refusée)
router.post('/remove', (req, res) => {
  const { gameId, toId } = req.body;
  removeInvitation(gameId, toId);
  res.json({ success: true });
});

export default router;
