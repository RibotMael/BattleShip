import { reactive, watch } from 'vue';

// Stockage réactif des invitations
export const invitationStore = reactive({
  invitations: [],
});

// Ajouter une invitation
export function sendInvite(inv) {
  invitationStore.invitations.push(inv);
}

// Supprimer une invitation
export function removeInvitation(gameId, toId) {
  const index = invitationStore.invitations.findIndex(
    i => i.gameId === gameId && i.toId === toId
  );
  if (index > -1) invitationStore.invitations.splice(index, 1);
}

// Récupérer toutes les invitations depuis le serveur
export async function fetchInvitations(userId) {
  try {
    const res = await fetch(`http://localhost:3000/api/invitations/${userId}`);
    const data = await res.json();
    invitationStore.invitations = data.invitations || [];
  } catch (err) {
    console.error("Erreur fetchInvitations :", err);
  }
}

// 🔹 Alias pour compatibilité Home.vue
export { invitationStore as eventBus };
