//BattleShip-ui/src/stores/invitationStore.js
export const invitationStore = {
  invitations: []
};

/**
 * Ajouter une invitation
 * invite = { gameId, senderId, receiverId, senderPseudo }
 */
export function sendInviteToDB(invite) {
  const newInvite = {
    ID: invitationStore.invitations.length + 1,
    ...invite,
    senderPseudo: invite.senderPseudo, 
    avatarUrl: invite.avatarUrl || null
  };
  invitationStore.invitations.push(newInvite);
  return newInvite.ID;
}


/**
 * Récupérer toutes les invitations pour un utilisateur
 */
export function getInvitationsForUserFromDB(userId) {
  return invitationStore.invitations.filter(inv => inv.receiverId === userId);
}

/**
 * Supprimer une invitation
 */
export function removeInvitationFromDB(inviteId) {
  invitationStore.invitations = invitationStore.invitations.filter(inv => inv.ID !== inviteId);
}

/**
 * Répondre à une invitation
 */
export function respondInviteDB(inviteId, accept, receiverId) {
  const index = invitationStore.invitations.findIndex(
    inv => inv.ID === inviteId && inv.receiverId === receiverId
  );

  if (index !== -1) {
    const invite = invitationStore.invitations[index];
    invitationStore.invitations.splice(index, 1);
    return accept ? { joinGameId: invite.gameId, playerId: invite.receiverId } : { success: true };
  }
  return { success: false, message: "Invitation non trouvée" };
}

