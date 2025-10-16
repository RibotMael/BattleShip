<template>
  <div class="battle-container">
    <!-- Bouton Abandonner -->
    <button class="btn-abandon" @click="abandonGame">Abandonner</button>

    <div class="grids-wrapper">
      <!-- Grille Joueur -->
      <div class="grid-section">
        <h2>Notre flotte</h2>
        <div class="grid player-grid">
          <div
            v-for="(cell, index) in playerGrid"
            :key="index"
            class="cell"
            :class="{ ship: cell === 1, hit: cell === 'hit', miss: cell === 'miss' }"
          ></div>
        </div>
      </div>

      <!-- Chrono circulaire -->
      <div class="timer-circle">
        <svg class="progress-ring" width="120" height="120">
          <circle
            class="progress-ring__circle"
            stroke="white"
            stroke-width="8"
            fill="transparent"
            r="54"
            cx="60"
            cy="60"
          />
        </svg>
        <div class="timer-text">{{ turnTimer }}s</div>
      </div>

      <!-- Grille Adversaire -->
      <div class="grid-section">
        <h2>Adversaire</h2>
        <div class="grid opponent-grid">
          <div
            v-for="(cell, index) in opponentGrid"
            :key="index"
            class="cell"
            :class="{ hit: cell === 'hit', miss: cell === 'miss' }"
            @click="shoot(index)"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "GameBoard",
  props: {
    gameId: { type: String, required: true },
  },
  data() {
    return {
      playerGrid: Array(100).fill(0),
      opponentGrid: Array(100).fill(0),
      turnTimer: 15,
      gameOver: false,
      turnInterval: null,
      replayInterval: null,
      replayVotes: {},
      user: JSON.parse(localStorage.getItem("user")),
      canShoot: true,
    };
  },
  mounted() {
    this.startChrono();
    // ---------------- Bloquer rafraîchissement ----------------
    window.addEventListener("keydown", this.preventRefresh);

    // ---------------- Bloquer bouton retour ----------------
    window.history.pushState(null, document.title, window.location.href);
    window.addEventListener("popstate", this.preventBack);

    // Bloquer bouton refresh / fermeture
    window.addEventListener("beforeunload", this.preventUnload);
  },
  beforeUnmount() {
    if (this.turnInterval) clearInterval(this.turnInterval);
    if (this.replayInterval) clearInterval(this.replayInterval);
    window.removeEventListener("keydown", this.preventRefresh);
    window.removeEventListener("popstate", this.preventBack);
    window.removeEventListener("beforeunload", this.preventUnload);
  },
  methods: {
    // Empêche F5 / Ctrl+R
    preventRefresh(e) {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r")) e.preventDefault();
    },
    // Empêche bouton retour
    preventBack() {
      window.history.pushState(null, document.title, window.location.href);
    },
    preventUnload(e) {
      e.preventDefault();
      e.returnValue = ""; // Chrome nécessite cette propriété
    },
    // ---------------- Timer ----------------
    startChrono() {
      this.turnTimer = 15;
      if (this.turnInterval) clearInterval(this.turnInterval);
      this.updateCircle();

      this.turnInterval = setInterval(() => {
        if (this.gameOver) {
          clearInterval(this.turnInterval);
          return;
        }

        this.turnTimer--;
        this.updateCircle();

        if (this.turnTimer <= 0) {
          if (this.canShoot) this.autoShoot(); // tir auto si pas encore tiré
          this.turnTimer = 15;
          this.updateCircle();
          this.canShoot = true; // réautorise le tir pour le tour suivant
        }
      }, 1000);
    },

    updateCircle() {
      const circle = this.$el.querySelector(".progress-ring__circle");
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (this.turnTimer / 15) * circumference;
      circle.style.strokeDashoffset = offset;
    },

    // ---------------- Abandon ----------------
    abandonGame() {
      if (!confirm("Voulez-vous vraiment abandonner la partie ?")) return;
      alert("Vous avez abandonné la partie.");
      this.$router.push("/");
    },

    // ---------------- Tir manuel ----------------
    async shoot(index) {
      if (this.gameOver || !this.canShoot) return;
      if (this.opponentGrid[index]) return; // déjà tiré

      this.canShoot = false; // bloque le tir jusqu'au prochain tour
      await this.sendShoot(index);
    },

    // ---------------- Tir auto ----------------
    async autoShoot() {
      if (this.gameOver) return;

      const available = this.opponentGrid.map((v, i) => (v ? null : i)).filter((i) => i !== null);
      if (available.length === 0) return;

      const randomIndex = available[Math.floor(Math.random() * available.length)];
      await this.sendShoot(randomIndex);

      // réautorise le tir pour le prochain tour
      this.canShoot = true;
    },

    // ---------------- Envoi tir ----------------
    async sendShoot(index) {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) throw new Error("Utilisateur introuvable dans localStorage");

        const res = await fetch("http://localhost:3000/api/games/shoot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: user.id,
            cell: index + 1,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          console.warn("Tir échoué :", data.message);
          return;
        }

        // Mise à jour de la grille adverse
        this.opponentGrid[index] = data.hit ? "hit" : "miss";

        // Fin de partie
        if (data.gameOver) {
          this.gameOver = true;
          clearInterval(this.turnInterval);
          alert("Fin de partie !");
        }
      } catch (err) {
        console.error("Erreur shoot :", err);
      }
    },
    // ------------------- Demander si le joueur veut rejouer -------------------
    async askReplay() {
      const vote = confirm("Fin de partie ! Voulez-vous rejouer ?");
      const userId = this.user.id;

      // Envoie le vote au serveur
      try {
        await fetch(`http://localhost:3000/api/games/replay-vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.gameId,
            playerId: userId,
            vote,
          }),
        });
      } catch (err) {
        console.error("[REPLAY VOTE]", err);
      }

      // démarre le polling pour vérifier si les deux joueurs ont voté
      this.startReplayPolling();
    },

    // ------------------- Polling pour récupérer les votes -------------------
    startReplayPolling() {
      if (this.replayInterval) clearInterval(this.replayInterval);

      this.replayInterval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3000/api/games/${this.gameId}/replay-votes`);
          const data = await res.json();
          if (!data.success) return;

          this.replayVotes = data.votes; // { playerId: true/false }

          // on attend que tous les joueurs aient voté
          if (Object.keys(this.replayVotes).length === 2) {
            clearInterval(this.replayInterval);

            if (Object.values(this.replayVotes).every((v) => v === true)) {
              this.replayGame();
            } else {
              alert("Au moins un joueur a refusé de rejouer. Retour à l'accueil.");
              this.$router.push("/");
            }
          }
        } catch (err) {
          console.error("[REPLAY POLLING]", err);
        }
      }, 1000);
    },

    // ------------------- Relancer la partie -------------------
    replayGame() {
      this.playerGrid = Array(100).fill(0);
      this.opponentGrid = Array(100).fill(0);
      this.turnTimer = 15;
      this.gameOver = false;
      this.replayVotes = {};
      this.startChrono();
    },
  },
};
</script>

<style scoped>
.battle-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  overflow: hidden;
}

.grids-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 100px;
}

.grid-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

h2 {
  color: white;
  margin-bottom: 15px;
  font-size: 1.8rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(10, 50px);
  gap: 3px;
}

.cell {
  width: 50px;
  height: 50px;
  background: #eee;
  border: 1px solid #9b9b9b;
  cursor: pointer;
  transition: transform 0.2s;
}

.cell.ship {
  background: #2196f3;
}

.cell.hit {
  background: #e74c3c;
}

.cell.miss {
  background: #95a5a6;
}

.opponent-grid .cell:hover {
  transform: scale(1.15) rotate(-2deg);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn-abandon {
  width: auto;
  top: 20px;
  right: 20px;
  padding: 10px 15px;
  background-color: #e74c3c;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-abandon:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.timer-circle {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring__circle {
  stroke-dasharray: 339.292;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1s linear;
}

.timer-text {
  position: absolute;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}
</style>
