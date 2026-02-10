<!--PlaceShips.vue-->
<template>
  <div class="place-ships-container">
    <h1>🚢 Placement des bateaux</h1>

    <div class="top-info">
      <p>Partie ID : {{ game.ID_Game }}</p>
      <p>Joueurs prêts : {{ readyCount }} / {{ game.TotalPlayers }}</p>
    </div>

    <div class="main-layout">
      <!-- 🗺️ Grille du joueur -->
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

      <!-- ⚓ Flotte -->
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
      return this.game.mode === "fr"; // 🇫🇷 pour interdire les bateaux qui se touchent
    },
    readyCount() {
      return this.readyPlayers.length;
    },
  },

  mounted() {
    this.userId = Number(this.user?.id);
    this.game.ID_Game = Number(this.gameId);

    this.fetchGame().then((data) => {
      if (data.mode) this.game.mode = data.mode; // ✅ récupération du mode depuis le backend
      this.fleet = (data.fleet || []).map((ship) => ({ ...ship, placed: false }));
    });

    // 🔹 Vérification périodique si tous les joueurs sont prêts
    this.readyInterval = setInterval(async () => {
      const allReady = await this.checkAllPlayersReady();
      if (allReady) {
        clearInterval(this.readyInterval);
        this.$router.push({ name: "GameBoard", params: { gameId: this.game.ID_Game } });
      }
    }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.readyInterval);
  },
  methods: {
    async fetchGame() {
      try {
        const res = await fetch(`http://localhost:8080/api/games/${this.game.ID_Game}`);
        const data = await res.json();
        if (data.success) {
          this.game = {
            ...this.game,
            ...data.game,
            TotalPlayers: data.players.length,
            mode: data.game.mode,
          };
          this.readyPlayers = (data.players || []).filter((p) => p.validated);

          return { fleet: data.fleet, mode: data.mode };
        }
      } catch (err) {
        console.error("[FETCH GAME]", err);
      }
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
          const nIndex = ny * 10 + nx;
          if (this.grid[nIndex].hasShip) return true;
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
        if (idx >= 100) return (this.hoverCells = []);
        if (this.orientation === "horizontal" && Math.floor(idx / 10) !== row)
          return (this.hoverCells = []);
        if (this.grid[idx].hasShip || (this.isFrenchMode && this.isAdjacent(idx))) valid = false;
        indices.push(idx);
      }

      this.hoverCells = indices;
      this.invalidPreview = !valid;
    },

    placeOrRemoveShip(index) {
      const cell = this.grid[index];
      // Si la case contient déjà un bateau, on le supprime
      if (cell.hasShip) {
        const shipId = cell.shipId;
        this.grid.forEach((c) => {
          if (c.shipId === shipId) {
            c.hasShip = false;
            c.shipId = null;
          }
        });
        this.fleet[shipId].placed = false;
        this.selectedCell = null;
        return;
      }

      // Vérifie qu'un bateau est sélectionné
      if (this.selectedShipIndex === null) return alert("⚓ Sélectionnez un navire !");

      const ship = this.fleet[this.selectedShipIndex];
      const indices = [];
      const row = Math.floor(index / 10);

      // Vérifie la validité du placement
      for (let i = 0; i < ship.size; i++) {
        const idx = this.orientation === "horizontal" ? index + i : index + i * 10;
        if (idx >= 100) return alert("⚠️ Hors grille !");
        if (this.orientation === "horizontal" && Math.floor(idx / 10) !== row)
          return alert("⚠️ Placement invalide !");
        if (this.grid[idx].hasShip) return alert("⚠️ Collision !");
        if (this.isFrenchMode && this.isAdjacent(idx))
          return alert("⚠️ Trop proche d'un autre navire !");
        indices.push(idx);
      }

      // Place le bateau avec son numéro (shipId + 1)
      indices.forEach((i) => {
        this.grid[i] = { ...this.grid[i], hasShip: true, shipId: this.selectedShipIndex };
      });
      this.fleet[this.selectedShipIndex].placed = true;
      this.selectedShipIndex = null;
      this.hoverCells = [];
      this.selectedCell = index;
    },

    getCellClass(index) {
      const cell = this.grid[index];
      if (cell.hasShip) return "ship";
      if (this.hoverCells.includes(index))
        return this.invalidPreview ? "preview invalid" : "preview";
      if (this.selectedCell === index) return "selected"; // ✅ nouvelle classe
      return "";
    },

    async validatePlacement() {
      if (!this.canValidate) return alert("⛵ Placez tous vos bateaux avant de valider !");

      // Convertit chaque bateau en chiffre
      const shipsNumbers = this.grid.map((c) => (c.hasShip ? c.shipId + 1 : 0));

      try {
        const res = await fetch(`http://localhost:8080/api/games/place-ships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            playerId: this.userId,
            ships: shipsNumbers, // ⚡ tableau avec chiffres représentant chaque bateau
            mode: this.game.mode,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert("✅ Placement validé !");
          const allReady = await this.checkAllPlayersReady();
          if (allReady) {
            this.$router.push({ name: "GameBoard", params: { gameId: this.game.ID_Game } });
          } else {
            console.log("⏳ On attend les autres joueurs...");
          }
        } else {
          alert("Erreur : " + data.message);
        }
      } catch (err) {
        console.error("[VALIDATE PLACEMENT]", err);
      }
    },

    async checkAllPlayersReady() {
      try {
        const res = await fetch(`http://localhost:8080/api/games/${this.game.ID_Game}`);
        const data = await res.json();

        if (data.success) {
          // ✅ MET À JOUR LE STATE LOCAL
          this.readyPlayers = data.players.filter((p) => p.validated);

          // ✅ Battle Royale
          if (this.game.mode === "battle_royale") {
            return this.readyPlayers.length === data.players.length;
          }

          // 🎮 Mode classique
          return this.readyPlayers.length === this.game.TotalPlayers;
        }
      } catch (err) {
        console.error("[CHECK ALL READY]", err);
      }
      return false;
    },
<<<<<<< HEAD
=======

>>>>>>> 63aebf3 (pseudo dans invitation, positionnement aléatoire lors du placement des bateaux)
    placeShipsRandomly() {
      // Reset de la grille et des bateaux
      this.grid = this.grid.map(() => ({ hasShip: false, shipId: null }));
      this.fleet.forEach((ship) => (ship.placed = false));

      const directions = ["horizontal", "vertical"];

      for (let i = 0; i < this.fleet.length; i++) {
        const ship = this.fleet[i];
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
          attempts++;
          const orientation = directions[Math.floor(Math.random() * 2)];
          const startIndex = Math.floor(Math.random() * 100);
          const row = Math.floor(startIndex / 10);
          const indices = [];

          let valid = true;
          for (let j = 0; j < ship.size; j++) {
            const idx = orientation === "horizontal" ? startIndex + j : startIndex + j * 10;
            const idxRow = Math.floor(idx / 10);

            if (idx >= 100 || (orientation === "horizontal" && idxRow !== row)) {
              valid = false;
              break;
            }
            if (this.grid[idx].hasShip || (this.isFrenchMode && this.isAdjacent(idx))) {
              valid = false;
              break;
            }
            indices.push(idx);
          }

          if (valid) {
            indices.forEach((idx) => {
              this.grid[idx] = { hasShip: true, shipId: i };
            });
            ship.placed = true;
            placed = true;
          }
        }

        if (!placed) {
          alert("Impossible de placer tous les bateaux aléatoirement, réessayez !");
          break;
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
