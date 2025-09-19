// battleship-api/stores/invitationStore.js

export const invitationStore = {
  invitations: []
};

/**
 * Ajouter une invitation
 * invite = { gameId, fromId, toId, senderPseudo }
 */
export function sendInvite(invite) {
  invitationStore.invitations.push({
    gameId: invite.gameId,
    senderId: invite.fromId,
    receiverId: invite.toId,
    senderPseudo: invite.senderPseudo
  });
}

/**
 * Récupérer toutes les invitations pour un utilisateur
 */
export function getInvitationsForUser(userId) {
  return invitationStore.invitations.filter(inv => inv.receiverId === userId);
}

/**
 * Supprimer une invitation (par gameId et receiverId)
 */
export function removeInvitation(gameId, receiverId) {
  invitationStore.invitations = invitationStore.invitations.filter(
    inv => !(inv.gameId === gameId && inv.receiverId === receiverId)
  );
}
