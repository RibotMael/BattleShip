<!--PlaceShips.vue-->
<template>
  <div class="place-ships-container">
    <h1>🚢 Placement des bateaux</h1>

    <div class="top-info">
      <p>Partie ID : {{ game.ID_Game }} (Mode: {{ isFrenchMode ? "Français" : "Belge" }})</p>
      <p>Joueurs prêts : {{ readyCount }} / {{ game.TotalPlayers }}</p>
    </div>

    <div class="main-layout">
      <div class="player-grid">
        <h2>Votre grille</h2>
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
        <button class="validate-btn" :disabled="!canValidate" @click="validatePlacement">
          ✅ Valider mes bateaux
        </button>
        <button class="random-btn" @click="placeShipsRandomly">🎲 Placer aléatoirement</button>
      </div>

      <div class="side-panel">
        <h2>Flotte</h2>
        <div class="fleet-list">
          <div
            v-for="(ship, i) in fleet"
            :key="i"
            class="ship-card"
            :class="{ selected: selectedShipIndex === i, placed: ship.placed }"
            @click="selectShip(i)"
          >
            <div class="ship-header">
              <span>{{ ship.name }}</span>
              <span v-if="ship.placed" class="status">✅</span>
            </div>
            <div class="ship-size">
              <span v-for="n in ship.size" :key="n" class="size-block"></span>
            </div>
          </div>
        </div>

        <div class="orientation-toggle">
          <label>Orientation :</label>
          <button @click="toggleOrientation">
            {{ orientation === "horizontal" ? "➡️ Horizontale" : "⬇️ Verticale" }}
          </button>
        </div>

        <p class="ships-left">🛳️ Restants : {{ remainingShips }}</p>
      </div>
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

    // Initialisation du jeu avec Fallback
    this.fetchGame().then((data) => {
      if (data && data.mode) {
        this.game.mode = data.mode;
      }

      // Si on reçoit bien les bateaux du backend
      if (data && data.fleet && data.fleet.length > 0) {
        this.fleet = data.fleet.map((ship) => ({ ...ship, placed: false }));
      } else {
        // Fallback en cas d'erreur CORS
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
        return null; // Déclenche la flotte de secours dans le mounted
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
  text-align: center;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  min-height: 100vh;
  padding: 15px;
}

.top-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  font-size: 1.1em;
}

.main-layout {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 40px;
}

/* 🎯 Grille */
.grid {
  display: grid;
  grid-template-columns: repeat(10, 30px);
  grid-template-rows: repeat(10, 30px);
  gap: 2px;
}
.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #333;
  background-color: #87ceeb;
  cursor: pointer;
  transition: 0.2s;
}
.cell.preview {
  background-color: #4caf50 !important;
}
.cell.ship {
  background-color: #2c3e50;
}

/* ⚓ Panneau latéral */
.side-panel {
  width: 25%;
  background: rgba(0, 0, 0, 0.25);
  padding: 15px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fleet-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.ship-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
}
.ship-card:hover {
  background: rgba(255, 255, 255, 0.2);
}
.ship-card.selected {
  background: #f1c40f;
  color: black;
  font-weight: bold;
}
.ship-card.placed {
  opacity: 0.6;
}

.ship-header {
  display: flex;
  justify-content: space-between;
}
.ship-size {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  justify-content: center;
}
.size-block {
  width: 15px;
  height: 10px;
  background: #3498db;
  border-radius: 2px;
}

.orientation-toggle {
  margin-top: 15px;
}

.validate-btn {
  margin-top: 15px;
  background: #16a085;
  color: white;
  font-weight: bold;
}

.cell.preview.invalid {
  background-color: #e74c3c !important;
}
.cell.preview {
  background-color: #4caf50 !important;
}

.random-btn {
  margin-top: 10px;
  background: #f39c12;
  color: white;
  font-weight: bold;
}
</style>
