//eventBus.js
import { reactive } from 'vue';

export const userBus = reactive({ userUpdated: false });

export const invitationStore = reactive({ invitations: [] });

export function sendInvite(inv) {
  invitationStore.invitations.push(inv);
}

export function removeInvitation(inviteId) {
  const index = invitationStore.invitations.findIndex(i => i.ID === inviteId);
  if (index > -1) invitationStore.invitations.splice(index, 1);
}

export async function fetchInvitations(userId) {
  try {
    const res = await fetch(`http://localhost:3000/api/invitation/${userId}`);
    const data = await res.json();
    invitationStore.invitations = data.invitations || [];
  } catch (err) {
    console.error("Erreur fetchInvitations :", err);
  }
}
