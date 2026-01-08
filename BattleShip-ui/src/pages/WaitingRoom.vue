<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>

    <!-- Nombre de joueurs requis -->
    <p v-if="game?.mode !== 'battle_royale'">Nombre de joueurs requis : {{ game?.TotalPlayers }}</p>
    <p v-else>
      Mode Battle Royale – minimum 2 joueurs pour lancer, actuellement :
      {{ playersWithMe.length }} joueur{{ playersWithMe.length > 1 ? "s" : "" }}.
    </p>

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

        <button
          v-if="isHost"
          class="start-game-button"
          :disabled="!canStartGame"
          @click="startGame"
        >
          🚀 Démarrer la partie
        </button>

        <!-- Message de démarrage -->
        <p v-if="!canStartGame" class="info-text">
          <template v-if="game?.mode === 'battle_royale'">
            Minimum 2 joueurs pour lancer la partie, actuellement :
            {{ playersWithMe.length }} joueur{{ playersWithMe.length > 1 ? "s" : "" }}.
          </template>
          <template v-else>
            Attendez que tous les joueurs requis rejoignent la partie ({{ playersWithMe.length }}/{{
              game?.TotalPlayers
            }}).
          </template>
        </p>

        <button @click="leaveRoom" :disabled="!game?.ID_Game">
          {{ isHost ? "🗑️ Supprimer la partie" : "❌ Quitter la partie" }}
        </button>

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
      user: JSON.parse(localStorage.getItem("user")) || { id: 999, pseudo: "TestUser" },
      userId: 0,
      friends: [],
      isHost: false,
      polling: null,
      totalPlayers: null, // ⚠️ Ne pas forcer à 2
      errorMsg: "",
      invitationsList: [],
    };
  },
  computed: {
    invitations() {
      return this.invitationsList;
    },
    playersWithMe() {
      const allPlayers = Array.isArray(this.players) ? this.players.filter(Boolean) : [];
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
      if (!this.game) return false;
      if (Number(this.userId) !== Number(this.game.id_creator)) return false;

      // 🎯 Battle Royale : minimum 2 joueurs
      if (this.game.mode === "battle_royale") {
        return this.playersWithMe.length >= 2;
      }

      // 🎮 Modes classiques : tous les joueurs requis doivent être là
      const requiredPlayers = this.game.TotalPlayers;
      return this.playersWithMe.length === requiredPlayers;
    },
  },
  watch: {
    "game.status"(newStatus) {
      if (newStatus === "placement" || newStatus === "in_progress") {
        this.$router.replace({
          name: "PlaceShips",
          params: { gameId: String(this.game?.ID_Game) },
        });
      }
    },
  },
  async created() {
    this.userId = Number(this.user.id || 999);
    this.localGameId = this.gameId || this.$route.params.gameId;
    const storedGame = JSON.parse(localStorage.getItem("currentGame") || "null");

    if (!this.localGameId && storedGame?.ID_Game) this.localGameId = storedGame.ID_Game;

    if (storedGame) {
      this.game = {
        ID_Game: storedGame.ID_Game ?? storedGame.id_game ?? storedGame.id_Game,
        id_creator: storedGame.id_creator ?? storedGame.ID_Creator ?? storedGame.ID_Creator,
        TotalPlayers: storedGame.TotalPlayers ?? null,
        status: storedGame.status ?? "waiting",
      };
    }

    if (!this.localGameId) {
      this.errorMsg = "Impossible de récupérer l'ID de la partie.";
      return;
    }

    await this.initRoom();
  },
  beforeUnmount() {
    clearInterval(this.polling);
  },
  methods: {
    async inviteFriend(friendId) {
      if (!this.game?.ID_Game) {
        this.errorMsg = "Impossible d’inviter : aucune partie active.";
        return;
      }

      if (!friendId) {
        this.errorMsg = "Impossible d’inviter : ID ami invalide.";
        return;
      }

      try {
        console.log("Envoi invitation :", {
          gameId: this.game.ID_Game,
          senderId: this.userId,
          receiverId: friendId,
        });

        const res = await fetch("http://localhost:8080/api/invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            senderId: this.userId,
            receiverId: friendId,
          }),
        });
        const data = await res.json();

        if (!data.success) {
          console.error("[INVITE FRIEND FAILED]", data.message);
          this.errorMsg = "Impossible d’envoyer l’invitation : " + data.message;
          return;
        }

        console.log("Invitation envoyée, ID :", data.inviteId);
        this.fetchInvitations();
      } catch (err) {
        console.error("[INVITE FRIEND] Erreur :", err);
        this.errorMsg = "Erreur lors de l’envoi de l’invitation : " + err.message;
      }
    },
    async initRoom() {
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
      if (this.polling) clearInterval(this.polling);
      this.polling = setInterval(async () => {
        const prevStatus = this.game?.status;
        await this.fetchGame();
        await this.fetchInvitations();
        if (prevStatus !== this.game?.status && this.game.status === "placement") {
          this.$router.replace({ name: "PlaceShips", params: { gameId: this.game.ID_Game } });
        }
      }, 2000);
    },
    async fetchGame() {
      try {
        const res = await fetch(`http://localhost:8080/api/games/${this.localGameId}`);
        const data = await res.json();
        if (!data.success) return false;

        const oldStatus = this.game?.status;

        const isBattleRoyale = data.game.id_game_type === 1;

        this.game = {
          ID_Game: data.game.id_Game,
          id_creator: data.game.id_creator,
          TotalPlayers: isBattleRoyale ? null : data.game.TotalPlayers ?? null,
          status: data.game.status ?? "waiting",
          mode: isBattleRoyale ? "battle_royale" : "classic",
        };

        this.players = Array.isArray(data.players) ? data.players : [];
        this.onlinePlayers = Array.isArray(data.onlinePlayers) ? data.onlinePlayers : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);

        if (oldStatus !== this.game.status) this.$forceUpdate();
        return true;
      } catch (err) {
        console.error("[FETCH] Erreur fetchGame :", err);
        return false;
      }
    },
    async fetchFriends() {
      try {
        const res = await fetch(`http://localhost:8080/api/friends/list/${this.userId}`);
        const data = await res.json();
        this.friends = Array.isArray(data) ? data : [];
      } catch {
        this.friends = [];
      }
    },
    async fetchInvitations() {
      try {
        const res = await fetch(`http://localhost:8080/api/invitation/${this.userId}`);
        const data = await res.json();
        this.invitationsList =
          data.success && Array.isArray(data.invitations) ? data.invitations : [];
      } catch {
        this.invitationsList = [];
      }
    },
    async joinGameIfNeeded() {
      if (!this.game?.ID_Game) return;
      await this.joinGame();
    },
    async joinGame() {
      try {
        const res = await fetch("http://localhost:8080/api/games/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.localGameId, playerId: this.userId }),
        });
        const data = await res.json();
        if (!data.success) return;
        this.players = Array.isArray(data.players) ? data.players : this.players;
      } catch (err) {
        console.error("[JOIN] Erreur joinGame :", err);
      }
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
        const res = await fetch("http://localhost:8080/api/games/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.game.ID_Game, playerId: this.userId }),
        });
        const data = await res.json();
        if (!data.success) return;

        localStorage.removeItem("currentGame");
        clearInterval(this.polling);
        this.$router.push("/gamemode");
        this.game = null;
        this.players = [];
        this.onlinePlayers = [];
        this.isHost = false;
      } catch (err) {
        console.error("[LEAVE ROOM] Erreur :", err);
      }
    },
    async startGame() {
      if (!this.canStartGame) return;

      try {
        const res = await fetch("http://localhost:8080/api/games/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: this.game.ID_Game, userId: this.userId }),
        });
        const data = await res.json();
        if (!data.success) return;

        this.game.status = "placement";
      } catch (err) {
        console.error("[START GAME] Erreur:", err);
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
