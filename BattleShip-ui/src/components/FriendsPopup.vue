<template>
  <div class="popup-overlay">
    <div class="popup-content">
      <h2>👥 Mes amis</h2>

      <!-- Liste d'amis -->
      <div class="section">
        <h3>Liste d'amis</h3>
        <ul>
          <li v-for="f in friends" :key="f.ID_Users" class="friend-card">
            <div class="friend-left">
              <div class="avatar">
                <img :src="f.avatarUrl || defaultAvatar" alt="Avatar" />
              </div>
              <span class="status-dot" :class="f.isOnline ? 'online' : 'offline'"></span>
              <span class="friend-pseudo">{{ f.Pseudo }}</span>
            </div>
            <div class="friend-right">
              <button class="remove-button" @click="removeFriend(f.ID_Users)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Invitations reçues -->
      <div class="section" v-if="invitations.length">
        <h3>🎮 Invitations de partie reçues</h3>
        <ul>
          <li v-for="inv in invitations" :key="inv.ID" class="friend-card">
            <div class="friend-left">
              <div class="avatar">
                <img :src="inv.Avatar || defaultAvatar" alt="Avatar" />
              </div>
              <span class="friend-pseudo">
                Partie envoyée par {{ inv.senderPseudo || "joueur #" + inv.senderId }}
              </span>
            </div>
            <div class="friend-right">
              <button class="accept-button" @click="acceptInvitation(inv)">✓</button>
              <button class="remove-button" @click="refuseInvitation(inv)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Ajouter un ami -->
      <div class="section">
        <h3>➕ Ajouter un ami</h3>
        <div class="add-friend">
          <input v-model="identifier" placeholder="Pseudo de l'ami" />
          <button @click="addFriend" class="add-button">Ajouter</button>
        </div>
      </div>

      <!-- Demandes d'amis reçues -->
      <div class="section" v-if="requests.length">
        <h3>📩 Demandes d'amis reçues</h3>
        <ul>
          <li v-for="r in requests" :key="r.ID_Users" class="friend-card">
            <div class="friend-left">
              <div class="avatar">
                <img :src="r.avatarUrl || defaultAvatar" alt="Avatar" />
              </div>
              <span class="friend-pseudo">{{ r.Pseudo }}</span>
            </div>
            <div class="friend-right">
              <button class="accept-button" @click="acceptRequest(r.ID_Users)">✓</button>
              <button class="remove-button" @click="removeFriend(r.ID_Users)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <button class="close-btn" @click="$emit('close')">Fermer</button>
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
        avatarUrl: inv.senderAvatar ? `data:image/jpeg;base64,${inv.senderAvatar}` : defaultAvatar,
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
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: 1rem;
}

.popup-content {
  background: linear-gradient(145deg, #0f2a3d, #1b3b57);
  padding: 2rem;
  border-radius: 15px;
  width: 100%;
  max-width: 500px;
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  overflow-y: auto;
  max-height: 90vh;
}

.popup-content h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  text-align: center;
  text-shadow: 1px 1px 4px #000;
}

.section {
  margin-bottom: 1.8rem;
}

.section h3 {
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
  color: #ffd700;
  text-shadow: 1px 1px 2px #000;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.friend-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  transition: transform 0.2s, background 0.2s;
}
.friend-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.1);
}

.friend-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Avatars petits et ronds */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #fff;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.friend-pseudo {
  font-weight: 500;
}

.friend-right {
  display: flex;
  gap: 0.4rem;
}

button {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.accept-button {
  background-color: #28a745;
  color: white;
  width: 32px;
  height: 32px;
}
.accept-button:hover {
  background-color: #218838;
}

.remove-button {
  background-color: #e74c3c;
  color: white;
  width: 32px;
  height: 32px;
}
.remove-button:hover {
  background-color: #c0392b;
}

.add-friend {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.add-friend input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 8px;
  border: none;
  outline: none;
}
.add-button {
  background-color: #1f78b4;
  color: white;
  padding: 0.5rem 1rem;
}
.add-button:hover {
  background-color: #145d89;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid #fff;
}
.status-dot.online {
  background-color: #28a745;
}
.status-dot.offline {
  background-color: #e74c3c;
}

.close-btn {
  margin-top: 1rem;
  width: 100%;
  padding: 0.6rem;
  font-weight: bold;
  background-color: #555;
  color: white;
  border-radius: 10px;
}
.close-btn:hover {
  background-color: #333;
}
</style>
