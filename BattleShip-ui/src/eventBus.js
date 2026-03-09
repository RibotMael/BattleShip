import { reactive } from "vue";

export const userBus = reactive({
  userUpdated: false
});

export const invitationStore = reactive({
  invitations: [],
});

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
  return {
    ID_Users: user.ID_Users ?? user.id,
    Pseudo: user.Pseudo ?? user.pseudo ?? "Utilisateur",
    avatar: user.avatar ?? null,
    isOnline: user.isOnline ?? false,
  };
}

// ✅ Charger les invitations depuis le backend
export async function fetchInvitations(userId) {
  try {
    const res = await fetch(`http://localhost:8080/api/games/invite/${userId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.invitations)) {
      invitationStore.invitations = data.invitations;
      console.log("📨 Invitations chargées :", data.invitations);
    } else {
      console.warn("⚠️ Aucune invitation reçue :", data);
    }
  } catch (err) {
    console.error("❌ Erreur fetchInvitations :", err);
  }
}