<!--FriendsPopup.vue-->
<template>
  <div class="popup-overlay">
    <div class="popup-content">
      <h2>Mes amis</h2>

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
      <div class="invites-column">
        <h3>Invitations reçues :</h3>
        <ul>
          <li v-for="inv in invitations" :key="inv.ID">
            Partie #{{ inv.id_game }} de {{ inv.sender_id }}
            <div class="friend-right">
              <div class="friend-right">
                <button class="accept-button" @click="acceptInvitation(inv)">✓</button>
                <button class="remove-button" @click="refuseInvitation(inv)">✕</button>
              </div>
            </div>
          </li>
        </ul>
      </div>



      <!-- Ajouter un ami -->
      <h3>Ajouter un ami</h3>
      <input v-model="identifier" placeholder="Mettre le pseudo" />
      <button @click="addFriend">Ajouter</button>

      <!-- Demandes reçues -->
      <h3>Demandes d'amis reçues</h3>
      <ul>
        <li v-for="req in requests" :key="req.ID_Users">
          <div class="friend-left">
            <img v-if="req.avatar" :src="req.avatar" class="friend-avatar" />
            <span class="friend-pseudo">{{ req.Pseudo }}</span>
          </div>
          <div class="friend-right">
            <button class="accept-button" @click="acceptRequest(req.ID_Users)">✓</button>
            <button class="remove-button" @click="removeFriend(req.ID_Users)">✕</button>
          </div>
        </li>
      </ul>

      <button @click="$emit('close')">Fermer</button>
    </div>
  </div>
</template>

<script>
import { invitationStore, removeInvitation, sendInvite } from '@/eventBus';
export default {
  props: ["userId"],
  data() {
    return {
      friends: [],
      requests: [],
      identifier: "",
    };
  },
  mounted() {
    this.fetchFriends();
    this.fetchInvitations();
    this.fetchRequests(); 
    this.refreshInterval = setInterval(this.fetchInvitations, 3000)
  },
  beforeUnmount() {
    clearInterval(this.refreshInterval);
  },
  computed: {
    invitations() {
      return invitationStore.invitations;
    }
  },
  methods: {
    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/list/${this.userId}`);
        const friendsData = await res.json();
        // Normalisation uniforme avec WaitingRoom.vue
        this.friends = friendsData.map(f => ({
          ID_Users: f.id ?? f.ID_Users,
          Pseudo: f.pseudo ?? f.Pseudo,
          avatar: f.avatar || null,
          isOnline: f.isOnline ?? false,
        }));
      } catch (err) {
        console.error("Erreur récupération amis :", err);
      }
    },

    async fetchInvitations() {
      try {
        const res = await fetch(`http://localhost:3000/api/invitation/${this.userId}`);
        const data = await res.json();
        invitationStore.invitations = data.invitations || [];
      } catch (err) { console.error("Erreur récupération invitations :", err); }
    },
    async respondInvite(gameId, senderId, accept) {
      try {
        await fetch("http://localhost:3000/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, gameId, senderId, accept })
        });
        removeInvitation(gameId, this.userId);
        if (accept) this.$router.push(`/waiting-room/${gameId}`);
      } catch (err) { console.error(err); }
    },

    async fetchRequests() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/requests/${this.userId}`);
        const data = await res.json();
        this.requests = data.map(r => ({
          ID_Users: r.ID_Users,
          Pseudo: r.Pseudo,
          avatar: r.avatar || null,
          isOnline: r.isOnline ?? false,
          requestId: r.requestId
        }));
      } catch (err) {
        console.error("Erreur récupération demandes :", err);
      }
    },

    async inviteFriend(friendId) {
      if (!this.game.ID_Game || !this.userId) return;
      const payload = { gameId: this.game.ID_Game, fromId: this.userId, toId: friendId };
      try {
        const res = await fetch("http://localhost:3000/api/games/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) return alert("Erreur invitation : " + data.message);
        // ✅ Ne pas ajouter le joueur directement
        alert("Invitation envoyée !");
      } catch (err) {
        console.error(err);
        alert("Erreur serveur lors de l'invitation");
      }
    },

    async respondInvite(gameId, senderId, accept) {
      try {
        const res = await fetch("http://localhost:3000/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, gameId, senderId, accept })
        });
        const data = await res.json();

        removeInvitation(gameId, this.userId);

        if (accept && data.success) {
          await fetch("http://localhost:3000/api/games/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId,
              playerId: this.userId,
              totalPlayers: data.game?.TotalPlayers || 2
            })
          });
          this.$router.push(`/waiting-room/${gameId}`);
        }
      } catch (err) {
        console.error("Erreur respondInvite :", err);
      }
    },

    async addFriend() {
      if (!this.identifier.trim()) return alert("Pseudo requis");
      try {
        await fetch("http://localhost:3000/api/friends/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, identifier: this.identifier })
        });
        this.identifier = "";
        this.fetchFriends();
      } catch (err) {
        console.error("Erreur addFriend :", err);
      }
    },

    async acceptRequest(friendId) {
      try {
        await fetch("http://localhost:3000/api/friends/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, friendId })
        });
        this.fetchFriends();
        this.fetchRequests(); // <== ajouter
      } catch (err) {
        console.error("Erreur acceptRequest :", err);
      }
    },

    async removeFriend(friendId) {
      if (!confirm("Voulez-vous vraiment supprimer cet ami ?")) return;
      try {
        await fetch("http://localhost:3000/api/friends/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, friendId })
        });
        this.fetchFriends();
      } catch (err) {
        console.error("Erreur removeFriend :", err);
      }
    },
    async acceptInvitation(invitation) {
      try {
        const res = await fetch("http://localhost:3000/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, gameId: invitation.id_game, senderId: invitation.sender_id, accept: true })
        });
        const data = await res.json();
        removeInvitation(invitation.id_game, this.userId);
        if (data.success) {
          await fetch("http://localhost:3000/api/games/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: invitation.id_game,
              playerId: this.userId,
              totalPlayers: data.game?.TotalPlayers || 2
            })
          });
          this.$router.push(`/waiting-room/${invitation.id_game}`);
        }
      } catch (err) {
        console.error(err);
      }
    },

    async refuseInvitation(invitation) {
      try {
        await fetch("http://localhost:3000/api/invitation/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId, gameId: invitation.id_game, senderId: invitation.sender_id, accept: false })
        });
        removeInvitation(invitation.id_game, this.userId);
      } catch (err) {
        console.error(err);
      }
    },

  }
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

.friend-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 0.5rem;
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
.accept-button:hover { background-color: #218838; }

.remove-button {
  background-color: #e74c3c;
  color: white;
}
.remove-button:hover { background-color: #c0392b; }

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
}
.status-dot.online { background-color: #28a745; }
.status-dot.offline { background-color: #e74c3c; }
</style>