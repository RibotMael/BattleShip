<!--PlaceShips.vue-->
<template>
  <div class="place-ships-container">
    <header class="header">
      <h1>🚢 Placement</h1>
      <div class="top-info">
        <span>Partie: {{ game.ID_Game }}</span>
        <span>Prêts: {{ readyCount }}/{{ game.TotalPlayers }}</span>
      </div>
    </header>

    <div class="main-layout">
      <section class="player-grid">
        <div class="grid-container">
          <div class="grid" @mouseleave="hoverCells = []">
            <div
              v-for="(cell, index) in grid"
              :key="index"
              class="cell"
              :class="getCellClass(index)"
              @mouseenter="previewShip(index)"
              @click="placeOrRemoveShip(index)"
            ></div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="random-btn" @click="placeShipsRandomly">🎲 Aléatoire</button>
          <button class="validate-btn" :disabled="!canValidate" @click="validatePlacement">
            ✅ Valider
          </button>
        </div>
      </section>

      <aside class="side-panel">
        <div class="panel-header">
          <h2>Votre Flotte</h2>
          <div class="orientation-box">
            <button @click="toggleOrientation" class="toggle-btn">
              {{ orientation === "horizontal" ? "➡️ Horiz." : "⬇️ Vert." }}
            </button>
          </div>
        </div>

        <div class="fleet-list custom-scroll">
          <div
            v-for="(ship, i) in fleet"
            :key="i"
            class="ship-card"
            :class="{ selected: selectedShipIndex === i, placed: ship.placed }"
            @click="selectShip(i)"
          >
            <div class="ship-info">
              <span class="ship-name">{{ ship.name }}</span>
              <div class="ship-size">
                <span v-for="n in ship.size" :key="n" class="size-block"></span>
              </div>
            </div>
            <span v-if="ship.placed" class="status-icon">✅</span>
          </div>
        </div>

        <p class="ships-left">🛳️ Restants : {{ remainingShips }}</p>
      </aside>
    </div>
  </div>
</template>

<script>
import api from "@/api/api.js";

export default {
  props: { gameId: { type: String, required: true } },
  data() {
    return {
      game: { ID_Game: 0, TotalPlayers: 2, mode: "fr" },
      grid: Array.from({ length: 100 }, () => ({ hasShip: false, shipId: null })),
      readyPlayers: [],
      user: JSON.parse(localStorage.getItem("user")),
      userId: 0,
      fleet: [],
      selectedShipIndex: null,
      orientation: "horizontal",
      hoverCells: [],
      invalidPreview: false,
      selectedCell: null,
      readyInterval: null,
    };
  },
  computed: {
    remainingShips() {
      return this.fleet.filter((s) => !s.placed).length;
    },
    canValidate() {
      return this.remainingShips === 0;
    },
    isFrenchMode() {
      return this.game.mode === "fr";
    },
    readyCount() {
      return this.readyPlayers.length;
    },
  },

  mounted() {
    this.userId = Number(this.user?.id || this.user?.ID_Users);
    this.game.ID_Game = Number(this.gameId);

    this.fetchGame().then((data) => {
      if (data && data.mode) {
        this.game.mode = data.mode;
      }

      if (data && data.fleet && data.fleet.length > 0) {
        this.fleet = data.fleet.map((ship) => ({ ...ship, placed: false }));
      } else {
        console.warn("⚠️ Utilisation de la flotte locale de secours (CORS error)");
        this.fleet = [
          { name: "Porte-avions", size: 5, placed: false },
          { name: "Croiseur", size: 4, placed: false },
          { name: "Contre-torpilleur", size: 3, placed: false },
          { name: "Sous-marin", size: 3, placed: false },
          { name: "Torpilleur", size: 2, placed: false },
        ];
      }
    });

    this.readyInterval = setInterval(async () => {
      const allReady = await this.checkAllPlayersReady();
      if (allReady) {
        clearInterval(this.readyInterval);
        this.$router.push({ name: "GameBoard", params: { gameId: this.game.ID_Game } });
      }
    }, 2000);
  },
  beforeUnmount() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
  },
  methods: {
    async fetchGame() {
      try {
        const res = await api.get(`/games/${this.game.ID_Game}`);
        if (res.data && res.data.success) {
          const data = res.data;
          this.game = {
            ...this.game,
            ...data.game,
            TotalPlayers: data.players ? data.players.length : 2,
          };
          this.readyPlayers = (data.players || []).filter((p) => p.validated);
          return { fleet: data.fleet, mode: data.game.mode };
        }
      } catch (err) {
        console.error("[FETCH GAME] - API injoignable", err);
        return null;
      }
    },

    async validatePlacement() {
      if (!this.canValidate) return alert("⛵ Placez tous vos bateaux avant de valider !");
      const shipsNumbers = this.grid.map((c) => (c.hasShip ? c.shipId + 1 : 0));

      try {
        const res = await api.post("/games/place-ships", {
          gameId: this.game.ID_Game,
          playerId: this.userId,
          ships: shipsNumbers,
          mode: this.game.mode,
        });

        if (res.data.success) {
          await this.checkAllPlayersReady();
        } else {
          alert("Erreur : " + res.data.message);
        }
      } catch (err) {
        console.error("[VALIDATE PLACEMENT]", err);
        alert("Impossible d'envoyer le placement au serveur (vérifiez le CORS).");
      }
    },

    async checkAllPlayersReady() {
      try {
        const res = await api.get(`/games/${this.game.ID_Game}`);
        if (res.data && res.data.success) {
          const data = res.data;
          this.readyPlayers = data.players.filter((p) => p.validated || p.ready);

          if (this.game.mode === "battle_royale") {
            return this.readyPlayers.length === data.players.length;
          }
          return this.readyPlayers.length === this.game.TotalPlayers;
        }
      } catch (err) {
        // Mode silencieux pour éviter de spammer la console avec l'intervalle
      }
      return false;
    },

    selectShip(index) {
      if (this.fleet[index].placed) return;
      this.selectedShipIndex = index;
    },

    toggleOrientation() {
      this.orientation = this.orientation === "horizontal" ? "vertical" : "horizontal";
    },

    isAdjacent(index) {
      const x = index % 10;
      const y = Math.floor(index / 10);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) continue;
          if (this.grid[ny * 10 + nx].hasShip) return true;
        }
      }
      return false;
    },

    previewShip(startIndex) {
      if (this.selectedShipIndex === null) return (this.hoverCells = []);
      const ship = this.fleet[this.selectedShipIndex];
      const indices = [];
      const row = Math.floor(startIndex / 10);
      let valid = true;

      for (let i = 0; i < ship.size; i++) {
        const idx = this.orientation === "horizontal" ? startIndex + i : startIndex + i * 10;

        // Vérifie si on dépasse de la grille
        if (idx >= 100 || (this.orientation === "horizontal" && Math.floor(idx / 10) !== row)) {
          this.hoverCells = [];
          return;
        }

        // Vérifie la collision stricte OU l'adjacence (si mode français)
        if (this.grid[idx].hasShip || (this.isFrenchMode && this.isAdjacent(idx))) {
          valid = false;
        }

        indices.push(idx);
      }
      this.hoverCells = indices;
      this.invalidPreview = !valid;
    },

    placeOrRemoveShip(index) {
      const cell = this.grid[index];

      // Retirer un bateau existant
      if (cell.hasShip) {
        const shipId = cell.shipId;
        this.grid.forEach((c) => {
          if (c.shipId === shipId) {
            c.hasShip = false;
            c.shipId = null;
          }
        });
        this.fleet[shipId].placed = false;
        return;
      }

      // Placer un bateau
      if (this.selectedShipIndex === null || this.invalidPreview) return;
      this.hoverCells.forEach((i) => {
        this.grid[i] = { hasShip: true, shipId: this.selectedShipIndex };
      });
      this.fleet[this.selectedShipIndex].placed = true;
      this.selectedShipIndex = null;
      this.hoverCells = [];
    },

    getCellClass(index) {
      const cell = this.grid[index];
      if (cell.hasShip) return "ship";
      if (this.hoverCells.includes(index))
        return this.invalidPreview ? "preview invalid" : "preview";
      return "";
    },

    placeShipsRandomly() {
      // Nettoie la grille
      this.grid = this.grid.map(() => ({ hasShip: false, shipId: null }));
      this.fleet.forEach((ship) => (ship.placed = false));

      const directions = ["horizontal", "vertical"];
      for (let i = 0; i < this.fleet.length; i++) {
        const ship = this.fleet[i];
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 150) {
          attempts++;
          this.orientation = directions[Math.floor(Math.random() * 2)];
          this.selectedShipIndex = i;
          const start = Math.floor(Math.random() * 100);

          this.previewShip(start);

          if (this.hoverCells.length === ship.size && !this.invalidPreview) {
            this.placeOrRemoveShip(start);
            placed = true;
          }
        }
      }
    },
  },
};
</script>

<style scoped>
.place-ships-container {
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #001f33, #004066);
  color: white;
  min-height: 100vh;
  padding: 10px;
  overflow-x: hidden;
}

.header h1 {
  font-size: 1.4rem;
  margin: 5px 0;
}
.top-info {
  display: flex;
  justify-content: center;
  gap: 15px;
  font-size: 0.85rem;
  opacity: 0.9;
  margin-bottom: 10px;
}

.main-layout {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.grid-container {
  background: rgba(255, 255, 255, 0.05);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(10, 35px);
  grid-template-rows: repeat(10, 35px);
  gap: 1px;
  border: 2px solid #1a3a4a;
}

.cell {
  width: 35px;
  height: 35px;
  background-color: #5dade2;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.side-panel {
  width: 300px;
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.fleet-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ship-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
  border: 2px solid transparent;
}

.ship-card.selected {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.2);
}

.size-block {
  width: 12px;
  height: 8px;
  background: #3498db;
  display: inline-block;
  margin-right: 2px;
  border-radius: 1px;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 15px;
}

button {
  padding: 12px;
  border-radius: 6px;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.toggle-btn {
  background: #34495e;
  color: white;
  width: 100%;
}
.validate-btn {
  background: #27ae60;
  color: white;
}
.random-btn {
  background: #e67e22;
  color: white;
}
.validate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cell.preview {
  background-color: #2ecc71 !important;
}
.cell.preview.invalid {
  background-color: #e74c3c !important;
}
.cell.ship {
  background-color: #2c3e50;
  border: 1px solid #bdc3c7;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .grid {
    grid-template-columns: repeat(10, 8.5vw);
    grid-template-rows: repeat(10, 8.5vw);
  }

  .cell {
    width: 8.5vw;
    height: 8.5vw;
  }

  .side-panel {
    width: 100%;
    margin-top: 10px;
  }

  .fleet-list {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .ship-card {
    min-width: 120px;
    flex-direction: column;
    text-align: center;
  }

  .ship-info {
    margin-bottom: 5px;
  }

  .ship-name {
    font-size: 0.8rem;
  }
}

.custom-scroll::-webkit-scrollbar {
  height: 4px;
  width: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

/* -------------------------------------------
   Effets de clic et interactions (UX)
------------------------------------------- */

/* 1. Effet sur tous les boutons (Valider, Aléatoire, Rotation) */
button:active:not(:disabled) {
  transform: scale(0.92);
  filter: brightness(0.8);
  transition: transform 0.1s;
}

/* 2. Effet spécifique sur les cases de la grille au clic */
.cell:active {
  transform: scale(0.85);
  background-color: #2980b9; /* Change légèrement de bleu au clic */
  transition: transform 0.05s;
}

/* 3. Effet sur les cartes de la flotte (sur le côté) */
.ship-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.ship-card:hover:not(.placed) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(5px); /* Petit décalage vers la droite au survol */
}

.ship-card:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

/* 4. Amélioration visuelle du bouton Valider quand il est prêt */
.validate-btn:not(:disabled) {
  animation: pulse-green 2s infinite;
  box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7);
}

@keyframes pulse-green {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

/* 5. Feedback visuel sur le bouton Aléatoire */
.random-btn:hover {
  filter: brightness(1.1);
}

/* 6. Style pour les boutons désactivés */
button:disabled {
  filter: grayscale(1);
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
