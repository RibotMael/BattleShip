<!--WaintingRoom.vue-->
<template>
  <div class="background waiting-page">
    <div class="room-container">
      <header class="hud-header">
        <div class="header-main">
          <div class="status-indicator animate-pulse"></div>
          <h1>
            SALLE D'ATTENTE <span class="session-id" v-if="game">#{{ game.ID_Game }}</span>
          </h1>
        </div>
        <div class="game-badge" v-if="game">
          <span class="mode-text">{{ game.mode.replace("_", " ") }}</span>
        </div>
      </header>

      <div class="hud-grid">
        <aside class="hud-panel friends-panel">
          <div class="panel-tag">UNITÉS DISPONIBLES</div>
          <div class="list-scroll">
            <div v-if="friends.length === 0" class="empty-msg">AUCUNE UNITÉ EN LIGNE</div>
            <div v-for="friend in friends" :key="getUserId(friend)" class="friend-row">
              <div class="user-info">
                <span class="status-dot" :class="{ online: friend.isOnline }"></span>
                <span class="user-name">{{ friend.Pseudo || friend.pseudo }}</span>
              </div>
              <button
                class="btn-mini-action"
                @click="inviteFriend(getUserId(friend))"
                :disabled="!game?.ID_Game || isPlayerInGame(getUserId(friend))"
              >
                {{ isPlayerInGame(getUserId(friend)) ? "✓" : "+" }}
              </button>
            </div>
          </div>
        </aside>

        <main class="hud-panel main-panel">
          <div class="panel-tag">AFFECTATION DES TROUPES</div>

          <div v-if="game?.mode === 'battle_royale'" class="br-layout">
            <div class="player-wall">
              <div v-for="player in playersWithMe" :key="getUserId(player)" class="player-tag">
                <span class="tag-name">{{ player.Pseudo || player.pseudo }}</span>
                <button
                  v-if="isHost && getUserId(player) !== userId"
                  @click="kickPlayer(getUserId(player))"
                  class="tag-kick"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div v-else class="teams-layout">
            <div v-if="unassignedPlayers.length > 0" class="unassigned-section">
              <div class="section-title">EN ATTENTE D'ORDRES</div>
              <div class="player-wall">
                <div
                  v-for="player in unassignedPlayers"
                  :key="getUserId(player)"
                  class="player-tag unassigned"
                >
                  <span class="tag-name">{{ player.Pseudo || player.pseudo }}</span>
                  <div class="tag-controls">
                    <button class="ctrl-btn" @click="assignTeam(getUserId(player), 1)">T1</button>
                    <button class="ctrl-btn" @click="assignTeam(getUserId(player), 2)">T2</button>
                    <button
                      v-if="isHost && getUserId(player) !== userId"
                      class="ctrl-btn kick"
                      @click="kickPlayer(getUserId(player))"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="teams-grid">
              <div class="team-block t1">
                <div class="team-header">ÉQUIPE ALPHA</div>
                <div class="team-list">
                  <div v-for="player in team1Players" :key="getUserId(player)" class="member-row">
                    <span class="member-name">{{ player.Pseudo || player.pseudo }}</span>
                    <div class="member-actions">
                      <button @click="assignTeam(getUserId(player), 2)" class="btn-swap">⇄</button>
                      <button @click="assignTeam(getUserId(player), null)" class="btn-remove">
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="team-block t2">
                <div class="team-header">ÉQUIPE BETA</div>
                <div class="team-list">
                  <div v-for="player in team2Players" :key="getUserId(player)" class="member-row">
                    <span class="member-name">{{ player.Pseudo || player.pseudo }}</span>
                    <div class="member-actions">
                      <button @click="assignTeam(getUserId(player), 1)" class="btn-swap">⇄</button>
                      <button @click="assignTeam(getUserId(player), null)" class="btn-remove">
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer class="hud-footer">
            <div class="error-stack" v-if="isHost">
              <transition-group name="fade-error">
                <p v-if="hasNotEnoughPlayers" key="err1" class="hud-error">
                  ⚠️ EFFECTIF INSUFFISANT
                </p>
                <p v-if="hasUnassignedPlayers" key="err2" class="hud-error">
                  ⚠️ UNITÉS NON ASSIGNÉES
                </p>
                <p v-if="hasUnbalancedTeams" key="err3" class="hud-error">
                  ⚠️ DÉSÉQUILIBRE DÉTECTÉ
                </p>
              </transition-group>
            </div>

            <div class="button-group">
              <button
                v-if="isHost"
                class="btn-cyber btn-primary"
                :disabled="!canStartGame"
                @click="startGame"
              >
                ENGAGER LE COMBAT
              </button>
              <button @click="leaveRoom" class="btn-cyber btn-danger">ABANDONNER</button>
            </div>
            <p v-if="errorMsg" class="system-err">{{ errorMsg }}</p>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap");

/* ============================================================
   BASE
   ============================================================ */

.waiting-page {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(3, 10, 16, 0.9), rgba(3, 10, 16, 0.95)),
    url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  font-family: "Rajdhani", sans-serif;
  color: #dff2ee;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.room-container {
  width: 100%;
  max-width: 1100px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* ============================================================
   HEADER
   ============================================================ */

.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(29, 233, 192, 0.3);
  padding-bottom: 10px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 15px;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0;
}

.session-id {
  font-size: 1rem;
  color: rgba(29, 233, 192, 0.5);
}

.status-indicator {
  width: 12px;
  height: 12px;
  background: #1de9c0;
  border-radius: 2px;
  box-shadow: 0 0 10px #1de9c0;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

.game-badge {
  background: rgba(29, 233, 192, 0.1);
  border: 1px solid rgba(29, 233, 192, 0.3);
  border-radius: 4px;
  padding: 4px 15px;
}

.mode-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1de9c0;
  text-transform: uppercase;
}

/* ============================================================
   LAYOUT — GRILLE & PANNEAUX
   ============================================================ */

.hud-grid {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.hud-panel {
  background: rgba(6, 18, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  display: flex;
  flex-direction: column;
}

.panel-tag {
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 4px 12px;
  width: fit-content;
}

/* ============================================================
   PANNEAU AMIS
   ============================================================ */

.friends-panel {
  width: 280px;
}

.list-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.friend-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s;
}

.friend-row:hover {
  background: rgba(29, 233, 192, 0.05);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4a5568;
}

.status-dot.online {
  background: #1de9c0;
  box-shadow: 0 0 8px #1de9c0;
}

/* ============================================================
   PANNEAU PRINCIPAL
   ============================================================ */

.main-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #1de9c0;
  opacity: 0.7;
  margin-bottom: 10px;
}

/* ============================================================
   JOUEURS — TAGS & CONTRÔLES
   ============================================================ */

.player-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.player-tag {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 8px 12px;
}

.player-tag.unassigned {
  border-color: rgba(29, 233, 192, 0.3);
}

.tag-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.tag-controls {
  display: flex;
  gap: 5px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 10px;
}

/* ============================================================
   ÉQUIPES
   ============================================================ */

.teams-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 30px;
}

.team-block {
  background: rgba(255, 255, 255, 0.02);
  border-top: 3px solid #1de9c0;
  padding: 15px;
}

.team-block.t2 {
  border-top-color: #38bdf8;
}

.team-header {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 15px;
}

.member-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

/* ============================================================
   FOOTER
   ============================================================ */

.hud-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 20px;
}

.error-stack {
  margin-bottom: 10px;
}

.hud-error {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f87171;
  margin-bottom: 5px;
}

.system-err {
  color: #f87171;
  font-size: 0.8rem;
  margin-top: 8px;
}

.button-group {
  display: flex;
  gap: 15px;
}

/* ============================================================
   BOUTONS
   ============================================================ */

/* Invitation ami */
.btn-mini-action {
  background: #1de9c0;
  color: #030a10;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  font-weight: 700;
  cursor: pointer;
}

.btn-mini-action:disabled {
  background: rgba(29, 233, 192, 0.2);
  color: rgba(29, 233, 192, 0.5);
  cursor: not-allowed;
}

/* Contrôles d'assignation (T1 / T2 / ×) */
.ctrl-btn {
  background: transparent;
  border: 1px solid #1de9c0;
  color: #1de9c0;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.ctrl-btn.kick {
  border-color: #f87171;
  color: #f87171;
}

/* Kick dans le player-tag (battle royale) */
.tag-kick {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #f87171;
  color: #f87171;
  border-radius: 3px;
  width: 22px;
  height: 22px;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.tag-kick:hover {
  background: #f87171;
  color: white;
}

/* Swap d'équipe */
.btn-swap {
  background: transparent;
  border: 1px solid rgba(29, 233, 192, 0.4);
  color: #1de9c0;
  font-size: 0.85rem;
  padding: 0 8px;
  border-radius: 3px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}

.btn-swap:hover {
  background: rgba(29, 233, 192, 0.15);
}

/* Retrait de membre */
.member-actions button {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
  padding: 0 8px;
  cursor: pointer;
}

.member-actions .btn-remove:hover {
  color: #f87171;
}

/* Actions principales */
.btn-cyber {
  padding: 12px 25px;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  letter-spacing: 2px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #1de9c0;
  color: #030a10;
  flex: 2;
}

.btn-primary:disabled {
  background: #1a3a34;
  color: #2e6b62;
  cursor: not-allowed;
}

.btn-danger {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid #f87171;
  color: #f87171;
  flex: 1;
}

.btn-danger:hover {
  background: #f87171;
  color: white;
}

/* ============================================================
   TRANSITIONS
   ============================================================ */

.fade-error-enter-active,
.fade-error-leave-active {
  transition: all 0.3s ease;
}

.fade-error-enter-from,
.fade-error-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 900px) {
  .hud-grid {
    flex-direction: column;
  }

  .friends-panel {
    width: 100%;
    height: 180px;
    flex-shrink: 0;
  }

  .teams-grid {
    grid-template-columns: 1fr;
  }
}
</style>

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
      return this.playersWithMe.filter(
        (p) => Number(this.teamAssignments[this.getUserId(p)]) === 1,
      );
    },
    team2Players() {
      return this.playersWithMe.filter(
        (p) => Number(this.teamAssignments[this.getUserId(p)]) === 2,
      );
    },
    canStartGame() {
      if (!this.game || !this.isHost) return false;
      if (this.game.mode === "battle_royale") return this.playersWithMe.length >= 2;
      const req = this.playersPerTeam;
      return this.team1Players.length === req && this.team2Players.length === req;
    },
    hasNotEnoughPlayers() {
      if (!this.game) return false;
      if (this.game.mode === "battle_royale") {
        return this.playersWithMe.length < 2;
      }
      return this.playersWithMe.length < (this.game.TotalPlayers || 2);
    },
    hasUnassignedPlayers() {
      if (!this.game) return false;
      return this.game.mode !== "battle_royale" && this.unassignedPlayers.length > 0;
    },
    hasUnbalancedTeams() {
      if (!this.game || this.game.mode === "battle_royale") return false;

      if (this.hasNotEnoughPlayers || this.hasUnassignedPlayers) return false;

      return (
        this.team1Players.length !== this.playersPerTeam ||
        this.team2Players.length !== this.playersPerTeam
      );
    },
  },
  async created() {
    this.userId = Number(this.user.id || this.user.ID_Users || 999);
    this.localGameId = this.gameId || this.$route.params.gameId;

    await this.initRoom();

    // SOCKETS
    socket.emit("user_online", this.userId);
    socket.emit("join-room", this.localGameId);
    socket.on("update_friends_status", (onlineIds) => {
      this.friends = this.friends.map((f) => ({
        ...f,
        isOnline: onlineIds.includes(Number(this.getUserId(f))),
      }));
    });
    socket.on("player-kicked", ({ playerId }) => {
      if (Number(playerId) === this.userId) this.$router.push("/gamemode");
      else this.fetchGame();
    });
    socket.on("room-closed", () => {
      this.exitDueToClosure("La salle a été fermée par l'hôte.");
    });
  },
  beforeUnmount() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    socket.emit("leave-room", this.localGameId);
    clearInterval(this.polling);
    socket.off("update_friends_status");
    socket.off("player-kicked");
    socket.off("room-closed");
  },
  methods: {
    getUserId(obj) {
      if (!obj) return null;
      return Number(obj.ID_Users || obj.id_users || obj.id || obj.id_player || obj.ID);
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

        const g = data.game;
        this.game = {
          ID_Game: g.id_Game || g.ID_Game,
          id_creator: g.id_creator || g.ID_Creator,
          status: g.status,
          mode: Number(g.id_game_type) === 1 ? "battle_royale" : "classic",
          TotalPlayers: g.TotalPlayers || 2,
        };

        this.players = Array.isArray(data.players) ? data.players : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);

        if (!this.isHost) {
          const stillPresent = this.players.some(
            (p) => Number(this.getUserId(p)) === Number(this.userId),
          );
          if (!stillPresent) {
            this.exitDueToClosure("Vous avez été exclu de la salle.");
            return false;
          }
        }

        const newAssign = {};
        this.players.forEach((p) => {
          const pId = this.getUserId(p);
          if (p.team_number !== undefined && p.team_number !== null) {
            newAssign[pId] = Number(p.team_number);
          }
        });
        this.teamAssignments = newAssign;

        if (this.game.status === "placement") {
          this.$router.replace({ name: "PlaceShips", params: { gameId: this.game.ID_Game } });
        }
        return true;
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 410) {
          this.exitDueToClosure("La salle a été fermée par l'hôte.");
        }
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
      if (!this.game?.ID_Game || !friendId) {
        this.errorMsg = "Données d'invitation manquantes.";
        return;
      }

      try {
        const response = await api.post("/invitation", {
          gameId: Number(this.game.ID_Game),
          senderId: Number(this.userId),
          receiverId: Number(friendId),
        });
      } catch (err) {
        this.errorMsg = "Impossible de joindre le service d'invitation.";
      }
    },
    async assignTeam(playerId, team) {
      try {
        // On envoie 'team' à l'API (ton backend s'occupe de mapper vers team_number)
        await api.post("/games/assign-team", {
          gameId: Number(this.game.ID_Game),
          playerId: Number(playerId),
          team: team, // peut être 1, 2 ou null
        });

        // On rafraîchit immédiatement les données pour déplacer le joueur visuellement
        await this.fetchGame();
      } catch (err) {
        this.errorMsg = "Erreur lors du changement d'équipe.";
      }
    },
    async leaveRoom() {
      try {
        await api.post("/games/leave", { gameId: this.game.ID_Game, playerId: this.userId });
        this.$router.push("/gamemode");
      } catch (err) {
        // Mode silencieux
      }
    },
    async kickPlayer(playerId) {
      if (this.getUserId({ id: playerId }) === this.userId) return;
      if (!confirm("Voulez-vous vraiment exclure ce joueur ?")) return;
      try {
        await api.post("/games/kick", {
          gameId: this.game.ID_Game,
          hostId: Number(this.userId),
          targetPlayerId: Number(playerId),
        });
        await this.fetchGame();
      } catch (err) {
        // Mode silencieux
      }
    },

    // N'oublie pas d'ajouter aussi inviteAllFriends si tu l'utilises dans le template !
    async inviteAllFriends() {
      const onlineFriends = this.friends.filter(
        (f) => f.isOnline && !this.isPlayerInGame(this.getUserId(f)),
      );
      for (const friend of onlineFriends) {
        await this.inviteFriend(this.getUserId(friend));
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
      //alert(reason);
      this.$router.push("/gamemode");
    },
  },
};
</script>
