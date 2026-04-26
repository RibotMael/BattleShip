<!--PlaceShips.vue-->
<template>
  <div class="background place-ships-page">
    <div class="hud-container">
      <header class="tactical-header">
        <div class="header-left">
          <div class="radar-ping"></div>
          <h1>DEPLOIEMENT DE LA FLOTTE</h1>
        </div>
        <div class="header-right">
          <div class="info-block">
            <span class="label">MISSION</span>
            <span class="value">#{{ game.ID_Game }}</span>
          </div>
          <div class="info-block">
            <span class="label">UNITÉS PRÊTES</span>
            <span class="value">{{ readyCount }}/{{ game.TotalPlayers }}</span>
          </div>
        </div>
      </header>

      <div class="tactical-layout">
        <section class="grid-section">
          <div class="grid-wrapper">
            <div class="grid-radar" v-if="gameLoaded" @mouseleave="hoverCells = []">
              <div
                v-for="(cell, index) in grid"
                :key="index"
                class="sonar-cell"
                :class="getCellClass(index)"
                @mouseenter="previewShip(index)"
                @click="placeOrRemoveShip(index)"
              >
                <div class="cell-inner"></div>
              </div>
            </div>
          </div>

          <div class="grid-actions">
            <button class="btn-radar random" @click="placeShipsRandomly">
              <span class="icon">🎲</span> GÉNÉRATION ALÉATOIRE
            </button>
            <button class="btn-radar validate" :disabled="!canValidate" @click="validatePlacement">
              <span class="icon">🚀</span> CONFIRMER LA POSITION
            </button>
          </div>
        </section>

        <aside class="fleet-panel">
          <div class="panel-header">
            <div class="tag">
              ARSENAL DISPONIBLE (MODE {{ game.mode === "be" ? "BELGE" : "FRANÇAIS" }})
            </div>
            <button @click="toggleOrientation" class="btn-rotation" :class="orientation">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6m12-6a9 9 0 0 1-15 6.7L3 16"
                />
              </svg>
              {{ orientation === "horizontal" ? "HORIZONTAL" : "VERTICAL" }}
            </button>
          </div>

          <div class="fleet-list custom-scroll">
            <div
              v-for="(ship, i) in fleet"
              :key="i"
              class="ship-item"
              :class="{ selected: selectedShipIndex === i, isPlaced: ship.placed }"
              @click="selectShip(i)"
            >
              <div class="ship-visual">
                <div class="ship-segments">
                  <div v-for="n in ship.size" :key="n" class="segment"></div>
                </div>
              </div>
              <div class="ship-meta">
                <span class="name">{{ ship.name }}</span>
                <span class="size-text">{{ ship.size }} UNITÉS</span>
              </div>
              <div class="ship-status">
                <div class="status-indicator"></div>
              </div>
            </div>
          </div>
        </aside>
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
      gameLoaded: false,
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
      return this.game.mode !== "be";
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
        this.fleet = [
          { name: "Porte-avions", size: 5, placed: false },
          { name: "Croiseur", size: 4, placed: false },
          { name: "Contre-torpilleur", size: 3, placed: false },
          { name: "Sous-marin", size: 3, placed: false },
          { name: "Torpilleur", size: 2, placed: false },
        ];
      }

      this.gameLoaded = true;
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
        if (res.data?.success) {
          const data = res.data;
          this.game = {
            ...this.game,
            ...data.game,
            mode: data.mode,
            TotalPlayers: data.players ? data.players.length : 2,
          };
          this.readyPlayers = (data.players || []).filter((p) => p.validated);
          return { fleet: data.fleet, mode: data.mode };
        }
      } catch (err) {
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
        // Mode silencieux
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
        // Mode silencieux
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

        // 1. Vérification des limites de la grille
        if (idx >= 100 || (this.orientation === "horizontal" && Math.floor(idx / 10) !== row)) {
          this.hoverCells = [];
          return;
        }

        // 2. Vérification de collision directe (Interdit dans TOUS les modes)
        const collisionDirecte = this.grid[idx].hasShip;

        // 3. Vérification d'adjacence (Interdit UNIQUEMENT en mode Français)
        // On ajoute une sécurité : isAdjacent ne doit pas invalider si c'est le mode Belge
        const collisionAdjacente = this.isFrenchMode && this.isAdjacent(idx);

        if (collisionDirecte || collisionAdjacente) {
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
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap");

html,
body {
  overflow-x: hidden;
  position: relative;
  width: 100%;
}

.place-ships-page {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background: radial-gradient(circle at center, #061621 0%, #02080d 100%);
  font-family: "Rajdhani", sans-serif;
  color: #dff2ee;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  box-sizing: border-box;
  padding: 40px 20px;
}

.hud-container {
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 30px;
  box-sizing: border-box;
}

/* --- HEADER --- */
.tactical-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid rgba(29, 233, 192, 0.2);
  padding-bottom: 15px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}
.radar-ping {
  width: 12px;
  height: 12px;
  background: #1de9c0;
  border-radius: 50%;
  box-shadow: 0 0 15px #1de9c0;
  animation: ping 1.5s infinite;
}
@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
}

h1 {
  font-size: 1.5rem;
  letter-spacing: 4px;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 30px;
}
.info-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.info-block .label {
  font-size: 0.7rem;
  color: rgba(29, 233, 192, 0.5);
}
.info-block .value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1de9c0;
}

/* --- LAYOUT --- */
.tactical-layout {
  display: flex;
  gap: 40px;
  justify-content: center;
}

.tactical-layout > * {
  min-width: 0;
}

/* --- RADAR GRID --- */
.grid-wrapper {
  background: rgba(29, 233, 192, 0.03);
  padding: 15px;
  border: 1px solid rgba(29, 233, 192, 0.1);
  border-radius: 4px;
  position: relative;
  max-width: 100%;
  overflow-x: auto;
}

.grid-radar {
  display: grid;
  grid-template-columns: repeat(10, 40px);
  grid-template-rows: repeat(10, 40px);
  gap: 2px;
  background: rgba(29, 233, 192, 0.1); /* Lignes du quadrillage */
}

.sonar-cell {
  width: 40px;
  height: 40px;
  background: #030a10;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.cell-inner {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(29, 233, 192, 0.05);
}

/* État : Survol (Preview) */
.sonar-cell.preview {
  background: rgba(29, 233, 192, 0.3) !important;
}
.sonar-cell.preview.invalid {
  background: rgba(248, 113, 113, 0.3) !important;
}

/* État : Bateau placé */
.sonar-cell.ship {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  border: 1px solid #718096;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
}

/* --- ACTIONS --- */
.grid-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.btn-radar {
  flex: 1;
  padding: 12px;
  border: 1px solid #1de9c0;
  background: transparent;
  color: #1de9c0;
  font-family: "Rajdhani";
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-radar:hover:not(:disabled) {
  background: rgba(29, 233, 192, 0.1);
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.2);
}

.btn-radar.validate {
  background: #1de9c0;
  color: #030a10;
}

.btn-radar.validate:disabled {
  background: #1a3a34;
  border-color: transparent;
  color: #2e6b62;
}

/* --- FLEET PANEL --- */
.fleet-panel {
  width: 100%;
  max-width: 320px;
  background: rgba(6, 18, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 20px;
}
.tag {
  font-size: 0.7rem;
  color: rgba(29, 233, 192, 0.6);
  margin-bottom: 10px;
}

.btn-rotation {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-family: "Rajdhani";
  font-weight: 700;
}

.btn-rotation svg {
  transition: transform 0.3s;
}
.btn-rotation.vertical svg {
  transform: rotate(90deg);
}

.fleet-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 5px;
}

.ship-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.ship-item:hover {
  border-color: rgba(29, 233, 192, 0.4);
  background: rgba(29, 233, 192, 0.03);
}
.ship-item.selected {
  border-color: #1de9c0;
  background: rgba(29, 233, 192, 0.08);
  box-shadow: 0 0 15px rgba(29, 233, 192, 0.1);
}
.ship-item.isPlaced {
  opacity: 0.4;
  filter: grayscale(1);
  cursor: default;
}

.ship-visual .ship-segments {
  display: flex;
  gap: 3px;
}
.segment {
  width: 12px;
  height: 6px;
  background: #1de9c0;
  border-radius: 1px;
}

.ship-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ship-meta .name {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
}
.ship-meta .size-text {
  font-size: 0.65rem;
  color: rgba(29, 233, 192, 0.6);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border: 1px solid #1de9c0;
  border-radius: 50%;
}
.isPlaced .status-indicator {
  background: #1de9c0;
}

.fleet-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.remaining-count {
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-align: center;
}
.remaining-count span {
  color: #1de9c0;
  font-weight: 800;
}

@media (max-width: 850px) {
  .place-ships-page {
    padding: 20px 10px;
  }

  .tactical-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 15px;
  }

  .grid-wrapper {
    /* Empêche la grille de forcer une largeur fixe */
    max-width: 100%;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
  }

  .tactical-layout {
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .grid-radar {
    grid-template-columns: repeat(10, min(32px, 8.5vw));
    grid-template-rows: repeat(10, min(32px, 8.5vw));
    gap: 1px;
  }

  .grid-actions {
    width: 100%;
    flex-direction: column; /* Boutons l'un sur l'autre pour gagner de la largeur */
    gap: 10px;
  }

  .sonar-cell {
    width: min(32px, 8.5vw);
    height: min(32px, 8.5vw);
  }

  .fleet-panel {
    max-width: 100%;
    box-sizing: border-box;
  }

  .fleet-list {
    max-height: 300px; /* Limite la hauteur de la liste pour ne pas étirer l'écran */
  }
}

.custom-scroll::-webkit-scrollbar {
  width: 3px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(29, 233, 192, 0.2);
}
</style>
