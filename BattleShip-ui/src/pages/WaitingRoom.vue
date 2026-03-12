<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>

    <div class="room-columns">
      <div class="friends-column">
        <h3>Invitez vos amis :</h3>
        <ul>
          <li v-if="friends.length === 0" class="info-text">
            Vous n'avez pas encore d'amis à inviter.
          </li>
          <li v-for="friend in friends" :key="getUserId(friend)">
            <div class="friend-info">
              <span class="status-dot" :class="{ 'is-online': friend.isOnline }"></span>
              {{ friend.Pseudo || friend.pseudo }}
            </div>

            <button
              @click="inviteFriend(getUserId(friend))"
              :disabled="!game?.ID_Game || !friend.isOnline || isPlayerInGame(getUserId(friend))"
            >
              {{
                isPlayerInGame(getUserId(friend))
                  ? "Présent"
                  : friend.isOnline
                    ? "Inviter"
                    : "Hors-ligne"
              }}
            </button>
          </li>
        </ul>
        <button
          v-if="friends.length > 0 && isHost"
          @click="inviteAllFriends"
          :disabled="!game?.ID_Game"
          class="btn-invite-all"
        >
          Inviter tous les amis en ligne
        </button>
      </div>

      <div class="main-column">
        <div v-if="game?.mode === 'battle_royale'">
          <h2>Joueurs :</h2>
          <ul>
            <li v-for="player in playersWithMe" :key="getUserId(player)">
              <div class="player-info">
                {{ player.Pseudo || player.pseudo }}
                <span class="online-dot online"></span>
              </div>
              <button
                v-if="isHost && getUserId(player) !== userId"
                @click="kickPlayer(getUserId(player))"
                class="btn-kick"
              >
                ❌
              </button>
            </li>
          </ul>
        </div>

        <div v-else class="teams-system">
          <h2>Répartition des équipes</h2>

          <div class="unassigned-players" v-if="unassignedPlayers.length > 0">
            <h3>En attente d'assignation</h3>
            <ul>
              <li v-for="player in unassignedPlayers" :key="getUserId(player)">
                {{ player.Pseudo || player.pseudo }}
                <div class="actions">
                  <button
                    v-if="isHost || getUserId(player) === userId"
                    @click="assignTeam(getUserId(player), 1)"
                  >
                    ➡️ Eq. 1
                  </button>
                  <button
                    v-if="isHost || getUserId(player) === userId"
                    @click="assignTeam(getUserId(player), 2)"
                  >
                    ➡️ Eq. 2
                  </button>
                  <button
                    v-if="isHost && getUserId(player) !== userId"
                    @click="kickPlayer(getUserId(player))"
                    class="btn-kick"
                  >
                    ❌
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div class="teams-wrapper">
            <div class="team-box" :class="{ 'team-full': team1Players.length > playersPerTeam }">
              <h3>Équipe 1 ({{ team1Players.length }}/{{ playersPerTeam }})</h3>
              <ul>
                <li v-for="player in team1Players" :key="getUserId(player)">
                  {{ player.Pseudo || player.pseudo }}
                  <div class="actions">
                    <button
                      v-if="isHost || getUserId(player) === userId"
                      @click="assignTeam(getUserId(player), 2)"
                    >
                      ➡️ Eq. 2
                    </button>
                    <button
                      v-if="isHost || getUserId(player) === userId"
                      @click="assignTeam(getUserId(player), null)"
                      class="btn-remove"
                    >
                      Sortir
                    </button>
                  </div>
                </li>
              </ul>
            </div>

            <div class="team-box" :class="{ 'team-full': team2Players.length > playersPerTeam }">
              <h3>Équipe 2 ({{ team2Players.length }}/{{ playersPerTeam }})</h3>
              <ul>
                <li v-for="player in team2Players" :key="getUserId(player)">
                  {{ player.Pseudo || player.pseudo }}
                  <div class="actions">
                    <button
                      v-if="isHost || getUserId(player) === userId"
                      @click="assignTeam(getUserId(player), 1)"
                    >
                      ⬅️ Eq. 1
                    </button>
                    <button
                      v-if="isHost || getUserId(player) === userId"
                      @click="assignTeam(getUserId(player), null)"
                      class="btn-remove"
                    >
                      Sortir
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <hr class="separator" />

        <div class="footer-actions">
          <button
            v-if="isHost"
            class="start-game-button"
            :disabled="!canStartGame"
            @click="startGame"
          >
            🚀 Démarrer la partie
          </button>
          <p v-if="!canStartGame && isHost" class="info-text warning">
            {{
              game?.mode === "battle_royale"
                ? "Attente de joueurs..."
                : "Équilibrez les équipes pour lancer."
            }}
          </p>
          <button @click="leaveRoom" class="leave-btn">
            {{ isHost ? "🗑️ Supprimer la partie" : "❌ Quitter la partie" }}
          </button>
          <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from "@/api/api.js";
import socket from "../services/socket.js";

export default {
  props: { gameId: { type: [String, Number], required: false } },
  data() {
    return {
      localGameId: null,
      game: null,
      players: [],
      user: JSON.parse(localStorage.getItem("user")) || { id: 999, pseudo: "TestUser" },
      userId: 0,
      friends: [],
      isHost: false,
      polling: null,
      errorMsg: "",
      teamAssignments: {},
    };
  },
  computed: {
    playersWithMe() {
      const allPlayers = Array.isArray(this.players) ? this.players : [];
      if (allPlayers.length === 0 && this.userId) {
        return [{ ID_Users: this.userId, Pseudo: this.user?.pseudo || "Moi" }];
      }
      return allPlayers;
    },
    playersPerTeam() {
      return this.game?.TotalPlayers ? this.game.TotalPlayers / 2 : 0;
    },
    unassignedPlayers() {
      return this.playersWithMe.filter((p) => !this.teamAssignments[this.getUserId(p)]);
    },
    team1Players() {
      return this.playersWithMe.filter((p) => this.teamAssignments[this.getUserId(p)] === 1);
    },
    team2Players() {
      return this.playersWithMe.filter((p) => this.teamAssignments[this.getUserId(p)] === 2);
    },
    canStartGame() {
      if (!this.game || !this.isHost) return false;
      if (this.game.mode === "battle_royale") return this.playersWithMe.length >= 2;
      const req = this.playersPerTeam;
      return this.team1Players.length === req && this.team2Players.length === req;
    },
  },
  async created() {
    this.userId = Number(this.user.id || this.user.ID_Users || 999);
    this.localGameId = this.gameId || this.$route.params.gameId;

    await this.initRoom();

    // 📡 SOCKETS
    socket.emit("user_online", this.userId);
    socket.on("update_friends_status", (onlineIds) => {
      this.friends = this.friends.map((f) => ({
        ...f,
        isOnline: onlineIds.includes(Number(this.getUserId(f))),
      }));
    });
  },
  beforeUnmount() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    clearInterval(this.polling);
    socket.off("update_friends_status");
  },
  methods: {
    getUserId(obj) {
      return obj.ID_Users || obj.id_users || obj.id || obj.ID;
    },
    isPlayerInGame(id) {
      return this.playersWithMe.some((p) => Number(this.getUserId(p)) === Number(id));
    },
    async fetchFriends() {
      try {
        const res = await api.get(`/friends/list/${this.userId}`);
        const data = Array.isArray(res.data) ? res.data : res.data.friends || [];
        this.friends = data.map((f) => ({ ...f, isOnline: false }));
        socket.emit("get_online_friends");
      } catch (err) {
        this.friends = [];
      }
    },
    async fetchGame() {
      try {
        const res = await api.get(`/games/${this.localGameId}`);
        const data = res.data;
        if (!data.success) {
          this.exitDueToClosure();
          return false;
        }

        this.game = {
          ID_Game: data.game.id_Game || data.game.ID_Game,
          id_creator: data.game.id_creator || data.game.ID_Creator,
          status: data.game.status,
          mode: data.game.id_game_type === 1 ? "battle_royale" : "classic",
          TotalPlayers: data.game.TotalPlayers,
        };

        this.players = Array.isArray(data.players) ? data.players : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);

        // Sync des équipes
        const newAssign = {};
        this.players.forEach((p) => {
          if (p.team) newAssign[this.getUserId(p)] = p.team;
        });
        this.teamAssignments = newAssign;

        // Auto-redirection si la partie commence
        if (this.game.status === "placement") {
          this.$router.replace({ name: "PlaceShips", params: { gameId: this.game.ID_Game } });
        }
        return true;
      } catch (err) {
        return false;
      }
    },
    async initRoom() {
      await this.fetchGame();
      await this.fetchFriends();
      this.setupPolling();
    },
    setupPolling() {
      if (this.polling) clearInterval(this.polling);
      this.polling = setInterval(() => this.fetchGame(), 3000);
    },
    async inviteFriend(friendId) {
      try {
        await api.post("/invitation", {
          gameId: this.game.ID_Game,
          senderId: this.userId,
          receiverId: friendId,
        });
      } catch (err) {
        this.errorMsg = "Erreur invitation.";
      }
    },
    async assignTeam(playerId, team) {
      try {
        await api.post("/games/assign-team", { gameId: this.game.ID_Game, playerId, team });
        this.fetchGame();
      } catch (err) {
        console.error(err);
      }
    },
    async leaveRoom() {
      try {
        await api.post("/games/leave", { gameId: this.game.ID_Game, playerId: this.userId });
        this.$router.push("/gamemode");
      } catch (err) {
        console.error(err);
      }
    },
    async startGame() {
      try {
        await api.post("/games/start", {
          gameId: this.game.ID_Game,
          userId: this.userId,
          teams: this.teamAssignments,
        });
      } catch (err) {
        this.errorMsg = "Erreur démarrage.";
      }
    },
    exitDueToClosure(reason = "Salle fermée.") {
      clearInterval(this.polling);
      alert(reason);
      this.$router.push("/gamemode");
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
  background: linear-gradient(135deg, #001f33, #004466, #006699);
  color: white;
  padding: 2rem;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.waiting-room-container h1 {
  margin-bottom: 2rem;
  font-size: 2.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  letter-spacing: 2px;
}

.room-columns {
  display: flex;
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
  align-items: flex-start;
}

/* PANNEAUX (Colonnes) */
.friends-column,
.main-column {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.friends-column {
  flex: 1;
  min-width: 300px;
}

.main-column {
  flex: 2.5;
}

h2,
h3 {
  margin-top: 0;
  color: #00d4ff;
  border-bottom: 2px solid rgba(0, 212, 255, 0.2);
  padding-bottom: 0.5rem;
  margin-bottom: 1.2rem;
}

/* LISTES D'AMIS ET JOUEURS */
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: transform 0.2s ease;
}

li:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* STATUTS (Points de connexion) */
.friend-info,
.player-info {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #95a5a6; /* Hors ligne */
  margin-right: 12px;
  border: 2px solid rgba(0, 0, 0, 0.2);
}

.status-dot.is-online {
  background-color: #2ecc71; /* En ligne */
  box-shadow: 0 0 10px #2ecc71;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: 10px;
}

.online-dot.online {
  background-color: #2ecc71;
  box-shadow: 0 0 8px #2ecc71;
  animation: pulse 2s infinite;
}

/* ACTIONS ET BOUTONS */
.actions {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  border-radius: 6px;
  border: none;
  background: #3498db;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #2980b9;
  filter: brightness(1.1);
  transform: translateY(-2px);
}

button:disabled {
  background: #5a6b7d;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-invite-all {
  margin-top: 1.5rem;
  width: 100%;
  background: #8e44ad;
}

.btn-kick {
  background: #e74c3c;
  padding: 0.4rem 0.6rem;
}

.btn-remove {
  background: #f39c12;
}

/* SYSTÈME D'ÉQUIPES */
.unassigned-players {
  background: rgba(231, 76, 60, 0.1);
  border: 1px dashed rgba(231, 76, 60, 0.4);
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.teams-wrapper {
  display: flex;
  gap: 1.5rem;
}

.team-box {
  flex: 1;
  background: rgba(46, 204, 113, 0.05);
  border: 1px solid rgba(46, 204, 113, 0.2);
  padding: 1.5rem;
  border-radius: 12px;
}

.team-box.team-full {
  border-color: #f1c40f;
  box-shadow: 0 0 15px rgba(241, 196, 15, 0.2);
}

/* FOOTER */
.separator {
  margin: 2rem 0;
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
}

.footer-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.start-game-button {
  width: 100%;
  max-width: 400px;
  font-size: 1.2rem;
  padding: 1rem;
  background: #27ae60;
  box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
}

.leave-btn {
  background: transparent;
  border: 1px solid #e74c3c;
  color: #e74c3c;
}

.leave-btn:hover {
  background: #e74c3c;
  color: white;
}

.info-text.warning {
  color: #f1c40f;
  font-style: italic;
}

.error-text {
  color: #ff4757;
  font-weight: bold;
  background: rgba(255, 71, 87, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* RESPONSIVE */
@media (max-width: 950px) {
  .room-columns {
    flex-direction: column;
  }
  .friends-column,
  .main-column {
    width: 100%;
  }
  .teams-wrapper {
    flex-direction: column;
  }
}
</style>
