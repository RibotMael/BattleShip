<template>
  <div class="popup-overlay" @click.self="$emit('close')">
    <div class="popup-content">
      <header class="popup-header">
        <h2>👥 Mes amis</h2>
        <button class="header-close" @click="$emit('close')">✕</button>
      </header>

      <div class="section add-friend-section">
        <div class="add-friend-wrapper">
          <input
            v-model="identifier"
            placeholder="Rechercher un pseudo..."
            @keyup.enter="addFriend"
          />
          <button @click="addFriend" class="add-button">
            <span>➕</span>
          </button>
        </div>
      </div>

      <div class="scroll-area">
        <div class="section highlight" v-if="invitations.length">
          <h3>🎮 Invitations de partie</h3>
          <div class="card-list">
            <div v-for="inv in invitations" :key="inv.ID" class="friend-card invite-card">
              <div class="friend-left">
                <div class="avatar">
                  <img :src="inv.Avatar || defaultAvatar" alt="Avatar" />
                </div>
                <div class="friend-info">
                  <span class="friend-pseudo">{{ inv.senderPseudo || "Joueur" }}</span>
                  <span class="sub-text">t'invite à jouer !</span>
                </div>
              </div>
              <div class="friend-right">
                <button class="action-btn accept" @click="acceptInvitation(inv)" title="Accepter">
                  ✓
                </button>
                <button class="action-btn refuse" @click="refuseInvitation(inv)" title="Refuser">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="section" v-if="requests.length">
          <h3>📩 Demandes reçues</h3>
          <div class="card-list">
            <div v-for="r in requests" :key="r.ID_Users" class="friend-card request-card">
              <div class="friend-left">
                <div class="avatar">
                  <img :src="r.avatarUrl || defaultAvatar" alt="Avatar" />
                </div>
                <span class="friend-pseudo">{{ r.Pseudo }}</span>
              </div>
              <div class="friend-right">
                <button class="action-btn accept" @click="acceptRequest(r.ID_Users)">✓</button>
                <button class="action-btn refuse" @click="removeFriend(r.ID_Users)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <h3>Liste d'amis</h3>
            <span class="count-badge">{{ friends.length }}</span>
          </div>
          <div class="card-list">
            <div v-for="f in friends" :key="f.ID_Users" class="friend-card">
              <div class="friend-left">
                <div class="avatar-container">
                  <div class="avatar">
                    <img :src="f.avatarUrl || defaultAvatar" alt="Avatar" />
                  </div>
                  <span class="status-indicator" :class="f.isOnline ? 'online' : 'offline'"></span>
                </div>
                <span class="friend-pseudo" :class="{ 'is-offline': !f.isOnline }">{{
                  f.Pseudo
                }}</span>
              </div>
              <div class="friend-right">
                <button class="remove-link" @click="removeFriend(f.ID_Users)">Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { invitationStore, removeInvitation } from "@/eventBus";
import defaultAvatar from "@/assets/images/ppHomme.png";

export default {
  props: ["userId"],
  data() {
    return {
      friends: [],
      requests: [],
      identifier: "",
      defaultAvatar,
    };
  },
  computed: {
    invitations() {
      return invitationStore.invitations.map((inv) => ({
        ...inv,
<<<<<<< HEAD
        avatarUrl: inv.senderAvatar ? `data:image/jpeg;base64,${inv.senderAvatar}` : defaultAvatar,
=======
        avatarUrl: inv.avatarUrl || defaultAvatar,
>>>>>>> 63aebf3 (pseudo dans invitation, positionnement aléatoire lors du placement des bateaux)
      }));
    },
  },
  mounted() {
    this.fetchAll();
    this.refreshInterval = setInterval(this.fetchAll, 3000);
  },
  beforeUnmount() {
    clearInterval(this.refreshInterval);
  },
  methods: {
    async fetchAll() {
      await Promise.all([this.fetchFriends(), this.fetchRequests(), this.fetchInvitations()]);
    },

    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:8080/api/friends/list/${this.userId}`);
        const data = await res.json();
        this.friends = (data || []).map((f) => ({
          ID_Users: f.ID_Users ?? f.id,
          Pseudo: f.Pseudo ?? f.pseudo,
          isOnline: f.isOnline ?? false,
          avatarUrl: f.Avatar ? `data:${f.mime_type};base64,${f.Avatar}` : defaultAvatar,
        }));
      } catch (err) {
        console.error("❌ Erreur récupération amis :", err);
      }
    },

    async fetchRequests() {
      try {
        const res = await fetch(`http://localhost:8080/api/friends/requests/${this.userId}`);
        const data = await res.json();
        this.requests = (data || []).map((r) => ({
          ID_Users: r.ID_Users,
          Pseudo: r.Pseudo,
          isOnline: r.isOnline ?? false,
          avatarUrl: r.Avatar ? `data:${r.mime_type};base64,${r.Avatar}` : defaultAvatar,
        }));
      } catch (err) {
        console.error("❌ Erreur récupération demandes :", err);
      }
    },

    async fetchInvitations() {
      try {
        const res = await fetch(`http://localhost:8080/api/invitation/${this.userId}`);
        const data = await res.json();
        invitationStore.invitations = Array.isArray(data.invitations) ? data.invitations : [];
      } catch (err) {
        console.error("❌ Erreur récupération invitations :", err);
        invitationStore.invitations = [];
      }
    },

    async addFriend() {
      if (!this.identifier.trim()) return alert("Pseudo requis");
      try {
        await fetch("http://localhost:8080/api/friends/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, identifier: this.identifier }),
        });
        this.identifier = "";
        this.fetchFriends();
      } catch (err) {
        console.error("❌ Erreur addFriend :", err);
      }
    },

    async acceptInvitation(inv) {
      try {
        const res = await fetch("http://localhost:8080/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: this.userId,
            inviteId: inv.ID,
            gameId: inv.id_game,
            senderId: inv.sender_id,
            accept: true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          removeInvitation(inv.ID);
          await fetch("http://localhost:8080/api/games/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: inv.id_game, playerId: this.userId }),
          });
          this.$router.push(`/waiting-room/${inv.id_game}`);
        }
      } catch (err) {
        console.error("❌ Erreur acceptInvitation :", err);
      }
    },

    async refuseInvitation(inv) {
      try {
        await fetch("http://localhost:8080/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: this.userId,
            inviteId: inv.ID,
            gameId: inv.id_game,
            senderId: inv.sender_id,
            accept: false,
          }),
        });
        removeInvitation(inv.ID);
      } catch (err) {
        console.error("❌ Erreur refuseInvitation :", err);
      }
    },

    async acceptRequest(friendId) {
      try {
        await fetch("http://localhost:8080/api/friends/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, friendId }),
        });
        this.fetchFriends();
        this.fetchRequests();
      } catch (err) {
        console.error("❌ Erreur acceptRequest :", err);
      }
    },

    async removeFriend(friendId) {
      if (!confirm("Voulez-vous vraiment supprimer cet ami ?")) return;
      try {
        await fetch("http://localhost:8080/api/friends/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, friendId }),
        });
        this.fetchFriends();
        this.fetchRequests();
      } catch (err) {
        console.error("❌ Erreur removeFriend :", err);
      }
    },
  },
};
</script>

<style scoped>
/* Overlay avec flou gaussien */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 15, 25, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

/* Container style "Cyber/Space" */
.popup-content {
  background: #121c26;
  background: linear-gradient(160deg, #162431 0%, #0d141d 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 450px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  color: #e0e6ed;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

/* Header fixe */
.popup-header {
  padding: 20px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.popup-header h2 {
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: 0.5px;
}

.header-close {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;
}

.header-close:hover {
  color: #fff;
}

/* Barre de recherche / Ajout */
.add-friend-wrapper {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  margin: 15px 25px;
  padding: 5px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.add-friend-wrapper input {
  background: none;
  border: none;
  padding: 10px 15px;
  color: white;
  flex: 1;
  outline: none;
}

.add-button {
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-button:hover {
  background: #2563eb;
  transform: scale(1.05);
}

/* Zone de scroll */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 10px 25px 25px;
}

.scroll-area::-webkit-scrollbar {
  width: 5px;
}
.scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

/* Sections et Titres */
.section {
  margin-bottom: 25px;
}
.section h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
}

/* Cartes d'amis */
.friend-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.friend-card:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateX(5px);
}

.invite-card {
  border-left: 3px solid #fbbf24;
  background: rgba(251, 191, 36, 0.05);
}

/* Avatars et Status */
.avatar-container {
  position: relative;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #1e293b;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #121c26;
}

.status-indicator.online {
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e;
}
.status-indicator.offline {
  background: #64748b;
}

.friend-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sub-text {
  font-size: 0.75rem;
  color: #fbbf24;
}

.is-offline {
  color: #64748b;
}

/* Boutons d'action */
.friend-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: white;
  transition: opacity 0.2s;
}

.action-btn.accept {
  background: #22c55e;
}
.action-btn.refuse {
  background: #ef4444;
}
.action-btn:hover {
  opacity: 0.8;
}

.remove-link {
  background: none;
  border: none;
  color: #64748b;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 5px;
}

.remove-link:hover {
  color: #ef4444;
  text-decoration: underline;
}
</style>
