import { reactive } from "vue";
import api from "@/api/api.js"; // Importe ton instance Axios configurée

export const userBus = reactive({
  userUpdated: false
});

export const invitationStore = reactive({
  invitations: [],
});

// Ajouter une invitation (Localement)
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

// ✅ Charger les invitations depuis le backend (LOCAL ou DISTANT automatique)
export async function fetchInvitations(userId) {
  try {
    // On utilise l'instance 'api' qui sait si elle doit taper sur localhost ou Render
    const res = await api.get(`/games/invite/${userId}`);
    
    // Avec Axios, les données sont directement dans res.data
    const data = res.data;

    if (data.success && Array.isArray(data.invitations)) {
      invitationStore.invitations = data.invitations;
      console.log("📨 Invitations chargées :", data.invitations);
    } else {
      console.warn("⚠️ Aucune invitation reçue ou format invalide :", data);
      invitationStore.invitations = [];
    }
  } catch (err) {
    console.error("❌ Erreur fetchInvitations :", err);
    invitationStore.invitations = [];
  }
}