<!--WaitingRoom.vue-->
<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>
    <p>Partie ID : {{ game.ID_Game }}</p>
    <p>Nombre de joueurs requis : {{ game.TotalPlayers }}</p>

    <h2>Joueurs :</h2>
    <ul>
      <li v-for="player in playersWithMe" :key="player.ID_Users">
        {{ player.Pseudo }}
        <span class="online-dot" :class="{ online: isPlayerOnline(player.ID_Users) }"></span>
      </li>
    </ul>

    <div v-if="isHost">
      <h3>Invitez vos amis :</h3>
      <ul>
        <li v-if="friends.length === 0">Vous n'avez pas encore d'amis à inviter.</li>
        <li v-for="friend in friends" :key="friend.ID_Users">
          {{ friend.Pseudo }}
          <button
            @click="inviteFriend(friend.ID_Users)"
            :disabled="!game.ID_Game || !friend.ID_Users || isPlayerInGame(friend.ID_Users)"
          >
            {{ isPlayerInGame(friend.ID_Users) ? "Déjà dans la partie" : "Inviter" }}
          </button>
        </li>
      </ul>

      <button 
        v-if="friends.length > 0"
        @click="inviteAllFriends"
        :disabled="!game.ID_Game"
      >
        Inviter tous les amis
      </button>

      <p>Ou partagez ce lien :</p>
      <input type="text" :value="inviteLink" readonly />

      <button
        class="start-game-button"
        :disabled="!canStartGame"
        @click="startGame"
      >
        🚀 Démarrer la partie
      </button>
      <p v-if="!canStartGame" class="info-text">
        Attendez que tous les joueurs requis rejoignent la partie ({{ playersWithMe.length }}/{{ game.TotalPlayers || totalPlayers }})
      </p>
    </div>

    <button
      @click="leaveRoom"
      :disabled="!game.ID_Game"
    >
      {{ isHost ? "🗑️ Supprimer la partie" : "❌ Quitter la partie" }}
    </button>
  </div>
</template>

<script>
export default {
  props: { gameId: { type: String, required: true } },
  data() {
    return {
      game: { ID_Game: 0, TotalPlayers: 2, id_creator: 0, status: "preparation" },
      players: [],
      onlinePlayers: [],
      user: JSON.parse(localStorage.getItem("user")) || {},
      userId: 0,
      friends: [],
      isHost: false,
      inviteLink: "",
      polling: null,
      totalPlayers: 2
    };
  },
  computed: {
    playersWithMe() {
      const allPlayers = [...this.players];
      if (!allPlayers.some(p => Number(p.ID_Users) === Number(this.userId))) {
        allPlayers.push({ ID_Users: this.userId, Pseudo: this.user?.pseudo || "Moi" });
      }
      return allPlayers.filter((p, index, self) =>
        index === self.findIndex(pl => Number(pl.ID_Users) === Number(p.ID_Users))
      );
    },
    canStartGame() {
      if (Number(this.userId) !== Number(this.game.id_creator)) return false;
      const requiredPlayers = this.game.TotalPlayers || this.game.id_team_mode || 2;
      return this.playersWithMe.length === requiredPlayers;
    }
  },
  watch: {
    'game.status'(newStatus) {
      if (newStatus === 'in_progress') {
        this.$router.replace({ name: "PlaceShips", params: { gameId: String(this.game.ID_Game) } });
      }
    }
  },
  created() {
    this.userId = Number(this.user.id || 0);
    if (!this.userId) {
      alert("Connectez-vous pour rejoindre la partie !");
      this.$router.push("/");
      return;
    }
    this.game.ID_Game = Number(this.gameId);
    this.initRoom().catch(err => console.error("initRoom error:", err));
  },
  beforeUnmount() {
    clearInterval(this.polling);
  },
  methods: {
    async initRoom() {
      await this.fetchFriends();
      await this.fetchGame();        
      await this.joinGameIfNeeded(); 
      this.setupPolling();
    },

    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/list/${this.userId}`);
        const data = await res.json();
        if (!Array.isArray(data)) { this.friends = []; return; }
        this.friends = data.map(f => ({ ID_Users: f.id ?? f.ID_Users, Pseudo: f.pseudo ?? f.Pseudo, avatar: f.avatar || null }));
      } catch { this.friends = []; }
    },

    async fetchGame() {
      try {
        const res = await fetch(`http://localhost:3000/api/games/${this.gameId}`);
        const data = await res.json();
        if (!data.success) {
          clearInterval(this.polling);
          alert("La partie a été fermée ou introuvable.");
          return this.$router.push("/gamemode");
        }
        this.game = { ...this.game, ...data.game };
        this.players = data.players || [];
        this.onlinePlayers = data.onlinePlayers || [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);
        this.totalPlayers = this.game.TotalPlayers || this.game.id_team_mode || 2;
      } catch (err) { console.error("Erreur fetchGame :", err); }
    },

    setupPolling() {
      this.polling = setInterval(this.fetchGame, 1000);
    },

    async joinGameIfNeeded() {
      await this.joinGame();
    },

    async joinGame() {
      try {
        const res = await fetch("http://localhost:3000/api/games/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.gameId, playerId: this.userId, totalPlayers: this.totalPlayers })
        });
        const data = await res.json();
        if (!data.success) return console.warn(data.message || "Impossible de rejoindre la partie.");
        this.players = data.players || [];
        this.game = { ...this.game, ...data.game };
        this.isHost = Number(this.userId) === Number(this.game.id_creator);
        this.inviteLink = `${window.location.origin}/waiting-room/${this.game.ID_Game}`;
      } catch (err) {
        console.error("Erreur joinGame :", err);
      }
    },

    // ✅ Correction : ne plus filtrer sur player_status
    isPlayerInGame(playerId) {
      return this.players.some(p => p && Number(p.ID_Users) === Number(playerId));
    },

    isPlayerOnline(playerId) { return this.onlinePlayers.includes(playerId); },

    async inviteFriend(friendId) {
      try {
        const res = await fetch("http://localhost:3000/api/games/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.game.ID_Game, senderId: this.userId, receiverId: friendId })
        });
        const data = await res.json();
        if (!data.success) return alert("Erreur invitation : " + data.message);
        alert(`Invitation envoyée à ${this.friends.find(f => f.ID_Users === friendId)?.Pseudo} !`);
      } catch (err) { console.error("inviteFriend error :", err); }
    },

    async inviteAllFriends() {
      for (const f of this.friends) if (!this.isPlayerInGame(f.ID_Users)) await this.inviteFriend(f.ID_Users);
    },

    // ✅ Réintégration respondInvite (côté invité)
    async respondInvite(senderId, accept) {
      try {
        const res = await fetch("http://localhost:3000/api/friends/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId, receiverId: this.userId, accept })
        });
        const data = await res.json();
        if (!data.success) return alert("Erreur réponse invitation : " + data.message);

        if (accept) {
          await fetch("http://localhost:3000/api/games/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: data.gameId,
              playerId: this.userId,
              totalPlayers: data.totalPlayers || 2
            })
          });
          this.$router.push(`/waiting-room/${data.gameId}`);
        }
      } catch (err) {
        console.error("respondInvite error :", err);
        alert("Erreur serveur lors de la réponse à l'invitation");
      }
    },

    async startGame() {
      if (!this.canStartGame) return;
      try {
        const res = await fetch(`http://localhost:3000/api/games/start/${this.game.ID_Game}`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
          this.game.status = "in_progress";
          this.$router.replace({ name: "PlaceShips", params: { gameId: String(this.game.ID_Game) } });
        }
      } catch (err) { console.error("startGame error:", err); }
    },

    async leaveRoom() {
      clearInterval(this.polling);
      if (!confirm(this.isHost ? "Voulez-vous vraiment supprimer la partie ?" : "Voulez-vous vraiment quitter la partie ?")) return;
      try {
        const res = await fetch("http://localhost:3000/api/games/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.game.ID_Game, playerId: this.userId })
        });
        const data = await res.json();
        if (!data.success) return alert(data.message || "Erreur lors du départ de la partie.");
        localStorage.removeItem("currentGame");
        this.$router.push({ name: "GameMode" });
      } catch (err) { console.error(err); }
    }
  }
};
</script>

<style scoped>
.waiting-room-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  padding: 2rem;
}
.online-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 8px;
  background-color: #7f8c8d;
  transition: all 0.3s;
}
.online-dot.online {
  background-color: #2ecc71;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #2980b9;
  color: white;
  font-weight: bold;
  cursor: pointer;
  margin-left: 0.5rem;
  margin-top: 0.5rem;
}
button:hover { background: #216f9d; }
.start-game-button { background-color: #27ae60; }
.start-game-button:disabled { background-color: #95a5a6; cursor: not-allowed; }
.info-text { color: #f1c40f; margin-top: 0.3rem; font-size: 0.9rem; }
</style>
