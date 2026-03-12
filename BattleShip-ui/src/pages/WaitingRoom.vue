<template>
  <div class="page-fixed">
    <div class="room-wrapper">
      <header class="header">
        <h1>Salle d'attente</h1>
        <div class="game-mode" v-if="game">{{ game.mode.replace("_", " ") }}</div>
      </header>

      <div class="content-grid">
        <aside class="panel friends-panel">
          <div class="panel-header">
            <h3>Amis</h3>
          </div>
          <div class="list-container">
            <div v-if="friends.length === 0" class="empty-msg">Aucun ami en ligne</div>
            <div v-for="friend in friends" :key="getUserId(friend)" class="mini-card">
              <div class="user-block">
                <span class="dot" :class="{ online: friend.isOnline }"></span>
                <span class="name">{{ friend.Pseudo || friend.pseudo }}</span>
              </div>
              <button
                class="btn-invite"
                @click="inviteFriend(getUserId(friend))"
                :disabled="!game?.ID_Game || !friend.isOnline || isPlayerInGame(getUserId(friend))"
              >
                {{ isPlayerInGame(getUserId(friend)) ? "✓" : "+" }}
              </button>
            </div>
          </div>
          <button v-if="isHost && friends.length > 0" @click="inviteAllFriends" class="btn-all">
            Tout inviter
          </button>
        </aside>

        <main class="panel main-panel">
          <div v-if="game?.mode === 'battle_royale'" class="br-section">
            <h3>Joueurs</h3>
            <div class="player-chips">
              <div v-for="player in playersWithMe" :key="getUserId(player)" class="chip">
                <span class="name-truncate">{{ player.Pseudo || player.pseudo }}</span>
                <span
                  v-if="isHost && getUserId(player) !== userId"
                  @click="kickPlayer(getUserId(player))"
                  class="kick"
                  >×</span
                >
              </div>
            </div>
          </div>

          <div v-else class="teams-section">
            <div v-if="unassignedPlayers.length > 0" class="waiting-box">
              <p>Non assignés</p>
              <div class="player-chips">
                <div v-for="player in unassignedPlayers" :key="getUserId(player)" class="chip">
                  <span class="name-truncate">{{ player.Pseudo || player.pseudo }}</span>
                  <div class="chip-actions">
                    <button
                      class="btn-team"
                      title="Assigner Équipe 1"
                      @click="assignTeam(getUserId(player), 1)"
                    >
                      1
                    </button>
                    <button
                      class="btn-team"
                      title="Assigner Équipe 2"
                      @click="assignTeam(getUserId(player), 2)"
                    >
                      2
                    </button>
                    <button
                      v-if="isHost && getUserId(player) !== userId"
                      class="btn-kick"
                      title="Exclure"
                      @click="kickPlayer(getUserId(player))"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="teams-grid">
              <div class="team-col">
                <h4>Équipe 1</h4>
                <div v-for="player in team1Players" :key="getUserId(player)" class="team-row">
                  <span class="name-truncate">{{ player.Pseudo || player.pseudo }}</span>
                  <div class="row-btns">
                    <button @click="assignTeam(getUserId(player), 2)">⇄</button>
                    <button @click="assignTeam(getUserId(player), null)" class="remove">×</button>
                  </div>
                </div>
              </div>

              <div class="team-col">
                <h4>Équipe 2</h4>
                <div v-for="player in team2Players" :key="getUserId(player)" class="team-row">
                  <span class="name-truncate">{{ player.Pseudo || player.pseudo }}</span>
                  <div class="row-btns">
                    <button @click="assignTeam(getUserId(player), 1)">⇄</button>
                    <button @click="assignTeam(getUserId(player), null)" class="remove">×</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="panel-footer">
            <button v-if="isHost" class="btn-start" :disabled="!canStartGame" @click="startGame">
              Lancer la partie
            </button>
            <button @click="leaveRoom" class="btn-leave">Quitter</button>
            <p v-if="errorMsg" class="err">{{ errorMsg }}</p>
          </footer>
        </main>
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
.page-fixed {
  position: fixed;
  inset: 0;
  background: #0f172a;
  color: #f8fafc;
  font-family: "Inter", sans-serif;
  display: flex;
  justify-content: center;
  padding: 20px;
  overflow-x: hidden; /* EMPÊCHE LE SCROLL HORIZONTAL GLOBAL */
}

.room-wrapper {
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.game-mode {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: #1e293b;
  padding: 4px 12px;
  border-radius: 20px;
  color: #38bdf8;
}

.content-grid {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-width: 0; /* ANTI-DÉBORDEMENT FLEX */
}

.friends-panel {
  width: 260px;
  flex-shrink: 0;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
}

.mini-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #334155;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  min-width: 0;
}

.name,
.name-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* TRONCATURE DU TEXTE */
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
  flex-shrink: 0;
}
.dot.online {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.btn-invite {
  background: #38bdf8;
  color: #0f172a;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-all {
  padding: 8px;
  background: none;
  border: 1px solid #38bdf8;
  color: #38bdf8;
  border-radius: 6px;
  font-size: 0.8rem;
}

.main-panel {
  flex: 1;
  padding: 20px;
  min-width: 0;
  overflow-y: auto;
}

.player-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  background: #334155;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%; /* S'ASSURE QUE LA PUCE NE DÉPASSE PAS */
}

.chip-actions {
  display: flex;
  gap: 6px; /* Espace entre les boutons */
  margin-left: auto; /* Pousse les boutons à droite dans la puce */
  padding-left: 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* Style commun pour les boutons d'équipe 1 et 2 */
.btn-team {
  background: #1e293b; /* Fond sombre pour trancher avec la puce */
  color: #38bdf8;
  border: 1px solid #38bdf8;
  border-radius: 4px; /* Carré légèrement arrondi */
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-team:hover {
  background: #38bdf8;
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Style pour le bouton Kick */
.btn-kick {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid #f87171;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-kick:hover {
  background: #f87171;
  color: white;
}

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.team-col {
  background: #0f172a;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #334155;
  min-width: 0; /* IMPORTANT POUR GRID */
}

.team-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #1e293b;
  font-size: 0.9rem;
  gap: 10px;
}

.row-btns {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.panel-footer {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

@media (max-width: 800px) {
  .content-grid {
    flex-direction: column;
  }
  .friends-panel {
    width: 100%;
    height: 200px;
  }
  .teams-grid {
    grid-template-columns: 1fr;
  }
  .page-fixed {
    position: relative;
    height: auto;
    min-height: 100vh;
  }
}
</style>
