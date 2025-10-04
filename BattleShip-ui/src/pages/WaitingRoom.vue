<!--WaitingRoom.vue-->
<!--WaitingRoom.vue-->
<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>
    <p>Nombre de joueurs requis : {{ game?.TotalPlayers || totalPlayers }}</p>

    <div class="room-columns">
      <!-- Colonne gauche : amis à inviter -->
      <div class="friends-column" v-if="isHost">
        <h3>Invitez vos amis :</h3>
        <ul>
          <li v-if="friends.length === 0">Vous n'avez pas encore d'amis à inviter.</li>
          <li v-for="friend in friends" :key="friend.ID_Users">
            {{ friend.Pseudo }}
            <button
              @click="inviteFriend(friend.ID_Users)"
              :disabled="!game?.ID_Game || !friend.ID_Users || isPlayerInGame(friend.ID_Users)"
            >
              {{ isPlayerInGame(friend.ID_Users) ? "Déjà dans la partie" : "Inviter" }}
            </button>
          </li>
        </ul>
        <button v-if="friends.length > 0" @click="inviteAllFriends" :disabled="!game?.ID_Game">
          Inviter tous les amis
        </button>
      </div>

      <!-- Colonne droite : infos joueurs -->
      <div class="main-column">
        <h2>Joueurs :</h2>
        <ul>
          <li v-for="player in playersWithMe" :key="player.ID_Users">
            {{ player.Pseudo }}
            <span class="online-dot" :class="{ online: isPlayerOnline(player.ID_Users) }"></span>
          </li>
        </ul>

        <button class="start-game-button" :disabled="!canStartGame" @click="startGame">
          🚀 Démarrer la partie
        </button>
        <p v-if="!canStartGame" class="info-text">
          Attendez que tous les joueurs requis rejoignent la partie ({{ playersWithMe.length }}/{{
            game?.TotalPlayers || totalPlayers
          }})
        </p>

        <button @click="leaveRoom" :disabled="!game?.ID_Game">
          {{ isHost ? "🗑️ Supprimer la partie" : "❌ Quitter la partie" }}
        </button>

        <p>DEBUG: game?.ID_Game={{ game?.ID_Game }}, isHost={{ isHost }}, userId={{ userId }}</p>

        <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { removeInvitation } from "@/eventBus.js";

export default {
  props: { gameId: { type: [String, Number], required: false } },
  data() {
    return {
      localGameId: null,
      game: null,
      players: [],
      onlinePlayers: [],
      // Fallback user si localStorage vide (développement / tests)
      user: JSON.parse(localStorage.getItem("user")) || { id: 999, pseudo: "TestUser" },
      userId: 0,
      friends: [],
      isHost: false,
      polling: null,
      totalPlayers: 2,
      errorMsg: "",
      invitationsList: [],
    };
  },
  computed: {
    invitations() {
      return this.invitationsList;
    },
    playersWithMe() {
      const allPlayers = Array.isArray(this.players) ? this.players.filter((p) => p) : [];
      if (!allPlayers.some((p) => Number(p.ID_Users) === Number(this.userId))) {
        allPlayers.push({
          ID_Users: this.userId,
          Pseudo: this.user?.pseudo || "Moi",
          avatar: this.user?.avatar || null,
        });
      }
      return allPlayers.filter(
        (p, index, self) =>
          index === self.findIndex((pl) => Number(pl.ID_Users) === Number(p.ID_Users))
      );
    },
    canStartGame() {
      if (!this.game || Number(this.userId) !== Number(this.game.id_creator)) return false;
      const requiredPlayers = this.game.TotalPlayers || this.totalPlayers;
      return this.playersWithMe.length === requiredPlayers;
    },
  },
  watch: {
    "game.status": {
      handler(newStatus) {
        if (newStatus === "started") {
          console.log("[WATCH] Game started, navigation vers PlaceShips");
          this.$router.replace({
            name: "PlaceShips",
            params: { gameId: String(this.game?.ID_Game) },
          });
        }
      },
      immediate: true,
    },
  },
  async created() {
    // Toujours avoir un userId
    this.userId = Number(this.user.id || 999);
    console.log("[CREATED] userId=", this.userId);

    // Récupération du gameId
    this.localGameId = this.gameId || this.$route.params.gameId;
    const storedGame = JSON.parse(localStorage.getItem("currentGame") || "null");

    if (!this.localGameId && storedGame?.ID_Game) this.localGameId = storedGame.ID_Game;

    // Init temporaire de game depuis localStorage
    if (storedGame) {
      this.game = {
        ID_Game: storedGame.ID_Game || storedGame.id_game || storedGame.id_Game,
        id_creator: storedGame.id_creator || storedGame.ID_Creator || storedGame.ID_Creator,
        TotalPlayers: storedGame.TotalPlayers || storedGame.totalPlayers || this.totalPlayers,
        status: storedGame.status || storedGame.Status || "waiting",
      };
      console.log("[CREATED] Game initialisé depuis localStorage:", this.game);
    }

    if (!this.localGameId) {
      this.errorMsg = "Impossible de récupérer l'ID de la partie.";
      console.warn("[CREATED] Aucun gameId trouvé !");
      return;
    }

    console.log("[CREATED] Initialisation salle pour gameId:", this.localGameId);
    const ok = await this.initRoom();
    if (ok) console.log("[CREATED] game après fetch :", this.game);
    else console.warn("[CREATED] Échec récupération game");
  },
  beforeUnmount() {
    console.log("[BEFOREUNMOUNT] Nettoyage polling");
    clearInterval(this.polling);
  },
  methods: {
    async initRoom() {
      console.log("[INIT] Initialisation de la room pour gameId:", this.localGameId);
      const gameOk = await this.fetchGame();
      if (!gameOk) {
        this.errorMsg = "Impossible de récupérer la partie depuis le serveur.";
        return false;
      }
      await this.fetchFriends();
      await this.joinGameIfNeeded();
      this.setupPolling();
      return true;
    },
    setupPolling() {
      console.log("[POLLING] Démarrage polling invitations et game");
      if (this.polling) clearInterval(this.polling);
      this.polling = setInterval(async () => {
        await this.fetchGame();
        await this.fetchInvitations();
        if (this.game?.status === "in_progress") this.game.status = "started";
      }, 5000);
    },
    async fetchGame() {
      try {
        const res = await fetch(`http://localhost:3000/api/games/${this.localGameId}`);
        const data = await res.json();
        if (!data.success) {
          console.warn("[FETCH] Game non trouvée :", this.localGameId);
          clearInterval(this.polling);
          localStorage.removeItem("currentGame");
          this.$router.push("/gamemode");
          return false;
        }
        this.game = {
          ID_Game: data.game.id_Game,
          id_creator: data.game.id_creator,
          TotalPlayers: data.game.TotalPlayers || this.totalPlayers,
          status: data.game.status || "waiting",
        };
        this.players = Array.isArray(data.players) ? data.players : [];
        this.onlinePlayers = Array.isArray(data.onlinePlayers) ? data.onlinePlayers : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);
        this.totalPlayers = this.game.TotalPlayers || this.totalPlayers;
        return true;
      } catch (err) {
        console.error("[FETCH] Erreur fetchGame :", err);
        this.errorMsg = "Impossible de récupérer la partie. Réessayez plus tard.";
        return false;
      }
    },
    async fetchFriends() {
      try {
        console.log("[FETCH] Récupération amis pour userId:", this.userId);
        const res = await fetch(`http://localhost:3000/api/friends/list/${this.userId}`);
        const data = await res.json();
        this.friends = Array.isArray(data) ? data : [];
        console.log("[FETCH] Friends list :", this.friends);
      } catch (err) {
        console.error("[FETCH] Erreur fetchFriends :", err);
        this.friends = [];
      }
    },
    async fetchInvitations() {
      try {
        const res = await fetch(`http://localhost:3000/api/games/invite/${this.userId}`);
        const data = await res.json();
        this.invitationsList =
          data.success && Array.isArray(data.invitations) ? data.invitations : [];
      } catch (err) {
        console.error("[CLIENT] Erreur fetchInvitations :", err);
        this.invitationsList = [];
      }
    },
    async respondInvite(inviteId, accept) {
      try {
        const res = await fetch("http://localhost:3000/api/games/invite/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, accept }),
        });
        const data = await res.json();
        if (!data.success) return alert(data.message || "Erreur réponse invitation");
        removeInvitation(inviteId);
        this.invitationsList = this.invitationsList.filter((inv) => inv.id !== inviteId);
        if (accept) await this.joinGame();
      } catch (err) {
        console.error("[CLIENT] respondInvite :", err);
      }
    },
    async joinGameIfNeeded() {
      if (!this.game?.ID_Game) return;
      await this.joinGame();
    },
    async joinGame() {
      try {
        const res = await fetch("http://localhost:3000/api/games/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.localGameId, playerId: this.userId }),
        });
        const data = await res.json();
        if (!data.success)
          return console.warn("[JOIN] Impossible de rejoindre la partie :", data.message);
        this.players = Array.isArray(data.players) ? data.players : this.players;
      } catch (err) {
        console.error("[JOIN] Erreur joinGame :", err);
      }
    },
    async inviteFriend(friendId) {
      if (!this.game?.ID_Game || !friendId) return;
      try {
        const res = await fetch("http://localhost:3000/api/games/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            senderId: this.userId,
            receiverId: friendId,
            senderPseudo: this.user?.pseudo,
          }),
        });
        const data = await res.json();
        if (!data.success) return alert("Erreur invitation : " + data.message);
        alert(
          `Invitation envoyée à ${this.friends.find((f) => f.ID_Users === friendId)?.Pseudo} !`
        );
      } catch (err) {
        console.error("[CLIENT] Erreur inviteFriend :", err);
      }
    },
    async inviteAllFriends() {
      await Promise.all(
        this.friends
          .filter((f) => !this.isPlayerInGame(f.ID_Users))
          .map((f) => this.inviteFriend(f.ID_Users))
      );
    },
    isPlayerInGame(playerId) {
      return this.players.some((p) => Number(p.ID_Users) === Number(playerId));
    },
    isPlayerOnline(playerId) {
      return this.onlinePlayers.includes(playerId);
    },
    async leaveRoom() {
      if (!this.game?.ID_Game) return;
      try {
        if (this.isHost) {
          const res = await fetch(
            `http://localhost:3000/api/games/delete/${this.game.ID_Game}?playerId=${this.userId}`,
            {
              method: "DELETE",
            }
          );
          const data = await res.json();
          if (!data.success) return alert("Erreur suppression : " + data.message);
        }
        localStorage.removeItem("currentGame");
        clearInterval(this.polling);
        this.$router.push("/gamemode");
        this.game = null;
        this.players = [];
        this.onlinePlayers = [];
        this.isHost = false;
      } catch (err) {
        console.error("[LEAVE ROOM] Erreur inattendue :", err);
        alert("Erreur de communication avec le serveur.");
      }
    },
    startGame() {
      if (!this.canStartGame) return;
      console.log("[START GAME] Partie démarrée par host");
      this.game.status = "started";
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

.room-columns {
  display: flex;
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
}

.friends-column {
  flex: 1;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 10px;
}

.main-column {
  flex: 2;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 10px;
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
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
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
button:hover {
  background: #216f9d;
}
.start-game-button {
  background-color: #27ae60;
}
.start-game-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}
.info-text {
  color: #f1c40f;
  margin-top: 0.3rem;
  font-size: 0.9rem;
}
.error-text {
  color: #e74c3c;
  margin-top: 0.5rem;
  font-weight: bold;
}
.friend-avatar,
.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 0.5rem;
  vertical-align: middle;
}
</style>
