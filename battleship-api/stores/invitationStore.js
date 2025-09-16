// battleship-api/stores/invitationStore.js

const invitations = []; // en mémoire

export function sendInvite(invite) {
  invitations.push(invite);
}

export function getInvitationsForUser(userId) {
  return invitations.filter(inv => inv.toId === userId);
}

export function removeInvite(gameId, toId) {
  const index = invitations.findIndex(
    inv => inv.gameId === gameId && inv.toId === toId
  );
  if (index !== -1) invitations.splice(index, 1);
}
