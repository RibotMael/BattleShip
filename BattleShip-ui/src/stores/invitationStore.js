import { reactive } from 'vue';

export const invitationStore = reactive({
  invitations: []
});

/**
 * Supprime une invitation de la liste locale (Front-end)
 */
export function removeInvitation(inviteId) {
  invitationStore.invitations = invitationStore.invitations.filter(
    inv => (inv.ID || inv.id) !== inviteId
  );
}