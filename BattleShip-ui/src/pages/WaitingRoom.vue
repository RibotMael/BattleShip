<template>
  <div class="waiting-room-container">
    <h1>⏳ Salle d'attente</h1>

    <div class="room-columns">
      <div class="friends-column">
        <h3>Invitez vos amis :</h3>
        <ul>
          <li v-if="friends.length === 0">Vous n'avez pas encore d'amis à inviter.</li>
          <li v-for="friend in friends" :key="friend.ID_Users">
            {{ friend.Pseudo }}
            <button
              @click="inviteFriend(friend.ID_Users)"
              :disabled="!game?.ID_Game || !friend.ID_Users || isPlayerInGame(friend.ID_Users)"
            >
              {{ isPlayerInGame(friend.ID_Users) ? "Déjà présent" : "Inviter" }}
            </button>
          </li>
        </ul>
        <button
          v-if="friends.length > 0 && isHost"
          @click="inviteAllFriends"
          :disabled="!game?.ID_Game"
        >
          Inviter tous mes amis
        </button>
      </div>

      <div class="main-column">
        <div v-if="game?.mode === 'battle_royale'">
          <h2>Joueurs :</h2>
          <ul>
            <li v-for="player in playersWithMe" :key="player.ID_Users">
              {{ player.Pseudo }}
              <span class="online-dot" :class="{ online: isPlayerOnline(player.ID_Users) }"></span>
              <button
                v-if="isHost && player.ID_Users !== userId"
                @click="kickPlayer(player.ID_Users)"
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
              <li v-for="player in unassignedPlayers" :key="player.ID_Users">
                {{ player.Pseudo }}
                <div class="actions">
                  <button
                    v-if="isHost || player.ID_Users === userId"
                    @click="assignTeam(player.ID_Users, 1)"
                  >
                    Rejoindre Eq. 1
                  </button>
                  <button
                    v-if="isHost || player.ID_Users === userId"
                    @click="assignTeam(player.ID_Users, 2)"
                  >
                    Rejoindre Eq. 2
                  </button>
                  <button
                    v-if="isHost && player.ID_Users !== userId"
                    @click="kickPlayer(player.ID_Users)"
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
                <li v-for="player in team1Players" :key="player.ID_Users">
                  {{ player.Pseudo }}
                  <div class="actions">
                    <button
                      v-if="isHost || player.ID_Users === userId"
                      @click="assignTeam(player.ID_Users, 2)"
                    >
                      ➡️ Eq. 2
                    </button>
                    <button
                      v-if="isHost || player.ID_Users === userId"
                      @click="assignTeam(player.ID_Users, null)"
                      class="btn-remove"
                    >
                      Sortir
                    </button>
                    <button
                      v-if="isHost && player.ID_Users !== userId"
                      @click="kickPlayer(player.ID_Users)"
                      class="btn-kick"
                    >
                      ❌
                    </button>
                  </div>
                </li>
              </ul>
            </div>

            <div class="team-box" :class="{ 'team-full': team2Players.length > playersPerTeam }">
              <h3>Équipe 2 ({{ team2Players.length }}/{{ playersPerTeam }})</h3>
              <ul>
                <li v-for="player in team2Players" :key="player.ID_Users">
                  {{ player.Pseudo }}
                  <div class="actions">
                    <button
                      v-if="isHost || player.ID_Users === userId"
                      @click="assignTeam(player.ID_Users, 1)"
                    >
                      ⬅️ Eq. 1
                    </button>
                    <button
                      v-if="isHost || player.ID_Users === userId"
                      @click="assignTeam(player.ID_Users, null)"
                      class="btn-remove"
                    >
                      Sortir
                    </button>
                    <button
                      v-if="isHost && player.ID_Users !== userId"
                      @click="kickPlayer(player.ID_Users)"
                      class="btn-kick"
                    >
                      ❌
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
                : `Équilibrez les équipes (${playersPerTeam} vs ${playersPerTeam}) pour lancer.`
            }}
          </p>

          <button @click="leaveRoom" :disabled="!game?.ID_Game" class="leave-btn">
            {{ isHost ? "🗑️ Supprimer la partie" : "❌ Quitter la partie" }}
          </button>

          <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import socket from "../services/socket.js";

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
      totalPlayers: null,
      errorMsg: "",
      invitationsList: [],
      teamAssignments: {}, // Stocke l'équipe de chaque joueur { ID_Users: 1 ou 2 }
    };
  },
  computed: {
    invitations() {
      return this.invitationsList;
    },
    playersWithMe() {
      // On s'assure que this.players est toujours un tableau
      const allPlayers = Array.isArray(this.players) ? this.players : [];

      // Si on veut vraiment forcer l'affichage de soi-même au début :
      if (allPlayers.length === 0 && this.userId) {
        return [
          {
            ID_Users: this.userId,
            Pseudo: this.user?.pseudo || "Moi",
            avatar: this.user?.avatar || null,
          },
        ];
      }
      return allPlayers;
    },
    playersPerTeam() {
      return this.game?.TotalPlayers ? this.game.TotalPlayers / 2 : 0;
    },
    unassignedPlayers() {
      return this.playersWithMe.filter((p) => !this.teamAssignments[p.ID_Users]);
    },
    team1Players() {
      return this.playersWithMe.filter((p) => this.teamAssignments[p.ID_Users] === 1);
    },
    team2Players() {
      return this.playersWithMe.filter((p) => this.teamAssignments[p.ID_Users] === 2);
    },
    canStartGame() {
      if (!this.game || !this.isHost) return false;
      if (Number(this.userId) !== Number(this.game.id_creator)) return false;

      // Battle Royale : minimum 2 joueurs
      if (this.game.mode === "battle_royale") {
        return this.playersWithMe.length >= 2;
      }

      // Modes classiques : les équipes doivent être pleines et égales
      const required = this.playersPerTeam;

      if (this.playersWithMe.length !== required * 2) return false;
      return (
        this.team1Players.length === required &&
        this.team2Players.length === required &&
        this.unassignedPlayers.length === 0
      );
    },
  },
  watch: {
    "game.status"(newStatus) {
      if (newStatus === "placement") {
        this.$router.replace({
          name: "PlaceShips",
          params: { gameId: String(this.game?.ID_Game) },
        });
      } else if (newStatus === "in_progress") {
        // Si on arrive et que c'est déjà en cours, on saute le placement
        this.$router.replace({
          name: "GameBoard",
          params: {
            gameId: String(this.game?.ID_Game),
            gameType: this.game.mode === "battle_royale" ? "BattleRoyal" : "1v1",
          },
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
    async assignTeam(playerId, teamNumber) {
      // 1. Mise à jour locale immédiate (Optimistic UI) pour que ce soit fluide pour l'host
      this.teamAssignments = {
        ...this.teamAssignments,
        [playerId]: teamNumber,
      };

      if (teamNumber === null) {
        delete this.teamAssignments[playerId];
      }

      // 2. Envoi de l'information au serveur pour que les autres joueurs la reçoivent
      try {
        await fetch("https://battleship-api-i276.onrender.com/api/games/assign-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            playerId: playerId,
            team: teamNumber, // 1, 2, ou null
          }),
        });
      } catch (err) {
        console.error("[ASSIGN TEAM] Erreur :", err);
        this.errorMsg = "Erreur lors de l'assignation de l'équipe.";
      }
    },
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
        const res = await fetch("https://battleship-api-i276.onrender.com/api/invitation", {
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
          this.errorMsg = "Impossible d’envoyer l’invitation : " + data.message;
          return;
        }
        this.fetchInvitations();
      } catch (err) {
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

    async kickPlayer(playerId) {
      if (!confirm("Voulez-vous vraiment éjecter ce joueur ?")) return;

      try {
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/kick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            hostId: this.userId,
            targetPlayerId: playerId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await this.fetchGame();
        }
      } catch (err) {
        this.errorMsg = "Erreur lors de l'expulsion du joueur.";
      }
    },

    async fetchGame() {
      try {
        const res = await fetch(
          `https://battleship-api-i276.onrender.com/api/games/${this.localGameId}`,
        );

        // 1. Si la route renvoie 404, la partie a été supprimée par l'Host
        if (res.status === 404) {
          this.exitDueToClosure("La salle d'attente a été fermée par l'hôte.");
          return false;
        }

        const data = await res.json();

        // 2. Si le succès est faux, on redirige également
        if (!data.success) {
          this.exitDueToClosure();
          return false;
        }

        // 3. Mise à jour des données de jeu
        const isBattleRoyale = data.game.id_game_type === 1;
        this.game = {
          ID_Game: data.game.id_Game,
          id_creator: data.game.id_creator,
          TotalPlayers: isBattleRoyale ? null : (data.game.TotalPlayers ?? null),
          status: data.game.status,
          mode: isBattleRoyale ? "battle_royale" : "classic",
        };

        // 4. Mise à jour de la liste des joueurs
        this.players = Array.isArray(data.players) ? data.players : [];
        this.onlinePlayers = Array.isArray(data.onlinePlayers) ? data.onlinePlayers : [];
        this.isHost = Number(this.userId) === Number(this.game.id_creator);

        // 5. DÉTECTION D'EXPULSION : Si je ne suis pas l'host et que je ne suis plus dans la liste
        const isMeInGame = this.players.some((p) => Number(p.ID_Users) === Number(this.userId));
        if (!isMeInGame && !this.isHost) {
          this.exitDueToClosure("Vous avez été éjecté de la partie.");
          return false;
        }

        // 6. Synchronisation des équipes
        const newAssignments = {};
        this.players.forEach((p) => {
          if (p.team !== undefined && p.team !== null) {
            newAssignments[p.ID_Users] = p.team;
          }
        });
        this.teamAssignments = newAssignments;

        return true;
      } catch (err) {
        console.error("[FETCH] Erreur fetchGame :", err);
        return false;
      }
    },

    // Méthode utilitaire à ajouter dans "methods" pour centraliser la sortie
    exitDueToClosure(reason = "La partie n'existe plus.") {
      clearInterval(this.polling);
      localStorage.removeItem("currentGame");

      if (this.errorMsg !== reason) {
        this.errorMsg = reason;
        alert(reason);
      }

      this.$router.push("/gamemode");
    },
    async fetchFriends() {
      try {
        const res = await fetch(
          `https://battleship-api-i276.onrender.com/api/friends/list/${this.userId}`,
        );
        const data = await res.json();
        this.friends = Array.isArray(data) ? data : [];
      } catch {
        this.friends = [];
      }
    },
    async fetchInvitations() {
      try {
        const res = await fetch(
          `https://battleship-api-i276.onrender.com/api/invitation/${this.userId}`,
        );
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
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/join", {
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
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/leave", {
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
        const res = await fetch("https://battleship-api-i276.onrender.com/api/games/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            userId: this.userId,
            teams: this.teamAssignments,
          }),
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
  background: linear-gradient(135deg, #001f33, #004466, #006699);
  color: white;
  padding: 2rem;
}

.waiting-room-container h1 {
  margin-bottom: 1.5rem;
  font-size: 2rem;
  letter-spacing: 1px;
}

.room-columns {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  max-width: 1200px;
  align-items: flex-start;
}

/* COLONNES */
.friends-column,
.main-column {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
  padding: 1.5rem;
  border-radius: 14px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.friends-column {
  flex: 1;
}

.main-column {
  flex: 2;
}

/* LISTES */
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

li:last-child {
  border-bottom: none;
}

/* ACTIONS (boutons groupés proprement) */
.actions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

/* BOUTONS PLUS PETITS */
button {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  border-radius: 6px;
  border: none;
  background: #2980b9;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;
  white-space: nowrap;
}

button:hover {
  background: #1f6691;
  transform: translateY(-1px);
}

button:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
  transform: none;
}

/* Bouton kick */
.btn-kick {
  background: #e74c3c;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}

.btn-kick:hover {
  background: #c0392b;
}

/* Bouton retirer */
.btn-remove {
  background: #f39c12;
}

.btn-remove:hover {
  background: #d68910;
}

/* ÉQUIPES */
.teams-system {
  margin-top: 1rem;
}

.unassigned-players {
  background: rgba(231, 76, 60, 0.15);
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.teams-wrapper {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.team-box {
  flex: 1;
  min-width: 260px;
  background: rgba(46, 204, 113, 0.15);
  padding: 1rem;
  border-radius: 12px;
  transition: 0.3s ease;
}

.team-box.team-full {
  box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
}

/* ONLINE DOT */
.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: 6px;
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
    transform: scale(1.3);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* FOOTER */
.separator {
  margin: 1.5rem 0;
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.footer-actions {
  text-align: center;
}

.start-game-button {
  width: 100%;
  font-size: 1rem;
  margin-top: 1rem;
  background-color: #27ae60;
  padding: 0.8rem;
  border-radius: 10px;
}

.start-game-button:hover {
  background-color: #219150;
}

.start-game-button:disabled {
  background-color: #95a5a6;
}

.leave-btn {
  margin-top: 1rem;
  background-color: #c0392b;
}

.leave-btn:hover {
  background-color: #a53125;
}

.info-text {
  color: #f1c40f;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.error-text {
  color: #ff6b6b;
  margin-top: 0.5rem;
  font-weight: bold;
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .room-columns {
    flex-direction: column;
  }

  .teams-wrapper {
    flex-direction: column;
  }
}
</style>
