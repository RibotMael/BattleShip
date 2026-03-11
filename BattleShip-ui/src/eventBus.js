import { reactive } from "vue";

export const invitationStore = reactive({
  invitations: [],
});

<<<<<<< HEAD
// Normaliser une invitation
function normalizeInvite(inv) {
=======
// Ajouter une invitation
export function sendInvite(invite) {
  const newId = invitationStore.invitations.length + 1;
  invitationStore.invitations.push({ id: newId, ...invite });
  return newId;
}

export function removeInvitation(inviteId) {
  invitationStore.invitations = invitationStore.invitations.filter(
    (inv) => inv.id !== inviteId
  );
}

// ✅ Normaliser un utilisateur
export function normalizeUser(user) {
>>>>>>> fix/retour-version
  return {
    ID: inv.ID ?? inv.id,                 // uniformiser ID
    senderId: inv.sender_id ?? inv.senderId,
    senderPseudo: inv.Pseudo ?? inv.senderPseudo ?? "Joueur inconnu",
    avatarUrl: inv.avatarUrl ?? (inv.Avatar ? `data:${inv.mime_type};base64,${inv.Avatar}` : null),
    gameId: inv.gameId ?? inv.id_game ?? null,
    status: inv.status ?? "Pending",
  };
}

// Ajouter une invitation
export function sendInvite(inv) {
  const newInvite = normalizeInvite(inv);
  newInvite.ID = invitationStore.invitations.length + 1;
  invitationStore.invitations.push(newInvite);
  return newInvite.ID;
}

// Supprimer une invitation
export function removeInvitation(inviteId) {
  invitationStore.invitations = invitationStore.invitations.filter(
    (inv) => inv.ID !== inviteId
  );
}

// Charger les invitations depuis le backend
export async function fetchInvitations(userId) {
  try {
    const res = await fetch(`https://battleship-api-i276.onrender.com/api/games/invite/${userId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.invitations)) {
      invitationStore.invitations = data.invitations.map(normalizeInvite);
      console.log("📨 Invitations chargées :", invitationStore.invitations);
    } else {
      invitationStore.invitations = [];
      console.warn("⚠️ Aucune invitation reçue :", data);
    }
  } catch (err) {
    console.error("❌ Erreur fetchInvitations :", err);
  }
}