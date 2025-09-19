// battleship-api/stores/invitationStore.js

export const invitations = [];

// Ajouter une invitation
export function sendInvite(gameId, fromId, toId, senderPseudo) {
  invitations.push({ gameId, senderId: fromId, receiverId: toId, senderPseudo });
}

// Supprimer une invitation (acceptée ou refusée)
export function removeInvitation(gameId, receiverId) {
  const index = invitations.findIndex(
    inv => inv.gameId === gameId && inv.receiverId === receiverId
  );
  if (index !== -1) invitations.splice(index, 1);
}

// Récupérer les invitations pour un utilisateur
export function getInvitationsForUser(userId) {
  return invitations.filter(inv => inv.receiverId === userId);
}
