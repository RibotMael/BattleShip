// invitationStore.js
const invitations = [];

export function sendInvite(invite) {
  const exists = invitations.some(
    inv => inv.gameId === invite.gameId && inv.fromId === invite.fromId && inv.toId === invite.toId
  );
  if (!exists) invitations.push(invite);
}

export function getInvitationsForUser(userId) {
  return invitations.filter(inv => inv.toId === userId);
}

export function removeInvite(gameId, fromId, toId) {
  const index = invitations.findIndex(
    inv => inv.gameId === gameId && inv.fromId === fromId && inv.toId === toId
  );
  if (index !== -1) invitations.splice(index, 1);
}