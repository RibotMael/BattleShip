<!-- FriendsPopup.vue -->
<template>
  <div class="popup-overlay">
    <div class="popup-content">
      <h2>👥 Mes amis</h2>

      <!-- Liste d'amis -->
      <ul>
        <li v-for="f in friends" :key="f.ID_Users">
          <div class="friend-left">
            <span class="status-dot" :class="f.isOnline ? 'online' : 'offline'"></span>
            <span class="friend-pseudo">{{ f.Pseudo }}</span>
          </div>
          <div class="friend-right">
            <button class="remove-button" @click="removeFriend(f.ID_Users)">✕</button>
          </div>
        </li>
      </ul>

      <!-- Invitations reçues -->
      <div class="invites-column" v-if="invitations.length">
        <h3>🎮 Invitations de partie reçues :</h3>
        <ul>
          <li v-for="inv in invitations" :key="inv.ID">
            Partie #{{ inv.id_game }} envoyée par joueur #{{ inv.sender_id }}
            <div class="friend-right">
              <button class="accept-button" @click="acceptInvitation(inv)">✓</button>
              <button class="remove-button" @click="refuseInvitation(inv)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Ajouter un ami -->
      <h3>➕ Ajouter un ami</h3>
      <input v-model="identifier" placeholder="Pseudo de l'ami" />
      <button @click="addFriend">Ajouter</button>

      <!-- Demandes d'amis reçues -->
      <div v-if="requests.length">
        <h3>📩 Demandes d'amis reçues</h3>
        <ul>
          <li v-for="r in requests" :key="r.ID_Users">
            {{ r.Pseudo }}
            <div class="friend-right">
              <button class="accept-button" @click="acceptRequest(r.ID_Users)">✓</button>
              <button class="remove-button" @click="removeFriend(r.ID_Users)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <button @click="$emit('close')">Fermer</button>
    </div>
  </div>
</template>

<script>
import { invitationStore, removeInvitation } from "@/eventBus";

export default {
  props: ["userId"],
  data() {
    return {
      friends: [],
      requests: [],
      identifier: "",
    };
  },
  computed: {
    invitations() {
      return invitationStore.invitations;
    },
  },
  mounted() {
    this.fetchFriends();
    this.fetchRequests();
    this.fetchInvitations();
    this.refreshInterval = setInterval(this.fetchInvitations, 3000);
  },
  beforeUnmount() {
    clearInterval(this.refreshInterval);
  },
  methods: {
    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/list/${this.userId}`);
        const data = await res.json();
        this.friends = (data || []).map((f) => ({
          ID_Users: f.id ?? f.ID_Users,
          Pseudo: f.pseudo ?? f.Pseudo,
          avatar: f.avatar ?? null,
          isOnline: f.isOnline ?? false,
        }));
      } catch (err) {
        console.error("❌ Erreur récupération amis :", err);
      }
    },

    async fetchInvitations() {
      try {
        const res = await fetch(`http://localhost:3000/api/invitation/${this.userId}`);
        const data = await res.json();
        invitationStore.invitations = Array.isArray(data.invitations) ? data.invitations : [];
      } catch (err) {
        console.error("❌ Erreur récupération invitations :", err);
        invitationStore.invitations = [];
      }
    },

    async fetchRequests() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/requests/${this.userId}`);
        const data = await res.json();
        this.requests = (data || []).map((r) => ({
          ID_Users: r.ID_Users,
          Pseudo: r.Pseudo,
          avatar: r.avatar ?? null,
          isOnline: r.isOnline ?? false,
        }));
      } catch (err) {
        console.error("❌ Erreur récupération demandes :", err);
      }
    },

    async addFriend() {
      if (!this.identifier.trim()) return alert("Pseudo requis");
      try {
        await fetch("http://localhost:3000/api/friends/add", {
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
        const res = await fetch("http://localhost:3000/api/invitation/respond", {
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
          await fetch("http://localhost:3000/api/games/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: inv.id_game,
              playerId: this.userId,
            }),
          });
          this.$router.push(`/waiting-room/${inv.id_game}`);
        }
      } catch (err) {
        console.error("❌ Erreur acceptInvitation :", err);
      }
    },

    async refuseInvitation(inv) {
      try {
        await fetch("http://localhost:3000/api/invitation/respond", {
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
        await fetch("http://localhost:3000/api/friends/accept", {
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
        await fetch("http://localhost:3000/api/friends/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, friendId }),
        });
        this.fetchFriends();
      } catch (err) {
        console.error("❌ Erreur removeFriend :", err);
      }
    },
  },
};
</script>

<style scoped>
.popup-content ul li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0;
}

.friend-left {
  display: flex;
  align-items: center;
}

.friend-pseudo {
  font-weight: 500;
}

.friend-right {
  display: flex;
  gap: 0.3rem;
}

.friend-right button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.accept-button {
  background-color: #28a745;
  color: white;
}
.accept-button:hover {
  background-color: #218838;
}

.remove-button {
  background-color: #e74c3c;
  color: white;
}
.remove-button:hover {
  background-color: #c0392b;
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
}
.status-dot.online {
  background-color: #28a745;
}
.status-dot.offline {
  background-color: #e74c3c;
}

.close-btn {
  margin-top: 1rem;
  background: #555;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
</style>
