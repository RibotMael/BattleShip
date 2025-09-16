<!--WaitingRoom.vue-->
<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>
    <p v-if="game.ID_Game">Partie ID : {{ game.ID_Game }}</p>
    <p v-if="game.TotalPlayers">Nombre de joueurs requis : {{ game.TotalPlayers }}</p>

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
  data() {
    return {
      game: {},
      players: [],
      onlinePlayers: [],
      userId: null,
      friends: [],
      isHost: false,
      inviteLink: "",
      polling: null,
      totalPlayers: 2,
      user: JSON.parse(localStorage.getItem("user")) || null,
    };
  },
  computed: {
    playersWithMe() {
      const allPlayers = [
        ...this.players,
        { ID_Users: this.userId, Pseudo: this.user?.pseudo || "Moi" },
      ];
      return allPlayers.filter(
        (p, index, self) =>
          index === self.findIndex(player => Number(player.ID_Users) === Number(p.ID_Users))
      );
    },
    canStartGame() {
      if (Number(this.userId) !== Number(this.game.creator_id)) return false;
      const requiredPlayers = this.game.TotalPlayers || this.game.team_mode_id || 2;
      return this.playersWithMe.length === requiredPlayers;
    },
  },
  created() {
    if (!this.user?.id) {
      alert("Connectez-vous pour rejoindre la partie !");
      this.$router.push("/");
      return;
    }
    this.userId = Number(this.user.id);
    this.initRoom();
  },
  beforeUnmount() {
    clearInterval(this.polling);
  },
  methods: {
    async initRoom() {
      await this.fetchFriends();
      await this.joinGame();
      this.setupPolling();
      await this.fetchGame(); 
    },
    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:3000/api/friends/list/${this.userId}`);
        const friendsData = await res.json();
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
    async fetchGame() {
      try {
        const gameIdFromRoute = this.$route.params.gameId;
        const res = await fetch(`http://localhost:3000/api/games/${gameIdFromRoute}`);
        const data = await res.json();

        if (!data.success) {
          clearInterval(this.polling);
          alert("La partie a été fermée ou introuvable.");
          return this.$router.push("/game-mode");
        }

        this.game = data.game || { ID_Game: gameIdFromRoute };
        if (!this.game.ID_Game) this.game.ID_Game = gameIdFromRoute;

        this.players = data.players || [];
        this.onlinePlayers = data.onlinePlayers || [];
        this.isHost = Number(this.userId) === Number(this.game.creator_id);
        this.totalPlayers = this.game.TotalPlayers || this.game.team_mode_id || 2;

        if (!this.game.status) this.game.status = "preparation";

        if (this.game.status === "started") {
          clearInterval(this.polling);
          this.$router.push(`/place-ships/${this.game.ID_Game}`);
        }

      } catch (err) {
        console.error("Erreur fetchGame :", err);
        alert("Erreur serveur lors de la récupération de la partie.");
      }
    },
    setupPolling() {
      this.polling = setInterval(this.fetchGame, 1500);
    },
    async joinGame() {
      try {
        const gameIdFromRoute = this.$route.params.gameId;
        if (!gameIdFromRoute) return alert("ID de partie manquant dans l'URL.");

        const res = await fetch("http://localhost:3000/api/games/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: gameIdFromRoute,
            playerId: this.userId,
            totalPlayers: this.totalPlayers,
          }),
        });

        const data = await res.json();
        if (!data.success) return alert(data.message || "Impossible de rejoindre la partie.");

        this.game = data.game || { ID_Game: gameIdFromRoute };
        if (!this.game.ID_Game) this.game.ID_Game = gameIdFromRoute;

        this.players = data.players || [];
        this.isHost = Number(this.userId) === Number(this.game.creator_id);

        this.inviteLink = `${window.location.origin}/waiting-room/${this.game.ID_Game}`;

      } catch (err) {
        console.error("Erreur joinGame :", err);
        alert("Erreur serveur lors de la tentative de rejoindre la partie.");
      }
    },
    isPlayerInGame(playerId) {
      return this.players.some(p => p.ID_Users === playerId);
    },
    isPlayerOnline(playerId) {
      return this.onlinePlayers.includes(playerId);
    },
    async inviteFriend(friendId) {
      if (!this.game.ID_Game || !this.userId || this.isPlayerInGame(friendId)) return;
      const payload = { gameId: this.game.ID_Game, fromId: this.userId, toId: friendId, senderPseudo: this.user?.pseudo || "Moi" };
      try {
        const res = await fetch("http://localhost:3000/api/games/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) alert("Erreur invitation : " + data.message);
      } catch (err) {
        console.error(err);
        alert("Erreur serveur lors de l'invitation");
      }
    },
    async inviteAllFriends() {
      for (const friend of this.friends) {
        if (!this.isPlayerInGame(friend.ID_Users)) {
          await this.inviteFriend(friend.ID_Users);
        }
      }
    },
    async startGame() {
      if (!this.canStartGame) return;
      try {
        const res = await fetch(`http://localhost:3000/api/games/start/${this.game.ID_Game}`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
          this.game.status = "started"; 
          clearInterval(this.polling);
          this.$router.push(`/place-ships/${this.game.ID_Game}`);
        }
      } catch (err) {
        console.error(err);
      }
    },
    async leaveRoom() {
      clearInterval(this.polling);
      const gameId = this.game?.ID_Game || this.$route.params.gameId;
      const playerId = this.userId;

      if (!gameId || !playerId) return alert("Impossible de quitter la partie : ID manquant.");

      const confirmMsg = this.isHost 
        ? "Voulez-vous vraiment supprimer la partie ?" 
        : "Voulez-vous vraiment quitter la partie ?";
      if (!confirm(confirmMsg)) return;

      try {
        const res = await fetch("http://localhost:3000/api/games/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId, playerId }),
        });
        const data = await res.json();
        if (!data.success) return alert(data.message || "Erreur lors du départ de la partie.");

        localStorage.removeItem("currentGame");
        alert(this.isHost ? "La partie a été supprimée !" : "Vous avez quitté la partie.");
        this.$router.push({ name: "GameMode" });
      } catch (err) {
        console.error(err);
        alert("Erreur serveur, veuillez réessayer.");
      }
    },
  },
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
