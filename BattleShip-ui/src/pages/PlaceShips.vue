<!--PlaceShips-->
<template>
  <div class="place-ships-container">
    <h1>⚓ Placement des bateaux</h1>
    <p>Mode : {{ game.language === 'fr' ? 'Français (5 bateaux)' : 'Belge (10 bateaux)' }}</p>
    <p>Bateaux restants : {{ shipsLeft }}</p>

    <div class="grid">
      <div
        v-for="cell in 100"
        :key="cell"
        class="cell"
        :class="{ ship: placedShips.includes(cell) }"
        @click="placeShip(cell)"
      ></div>
    </div>

    <button :disabled="shipsLeft > 0" @click="confirmPlacement">
      ✅ Valider le placement
    </button>
  </div>
</template>

<script>
export default {
  props: { gameId: { type: String, required: true } },
  data() {
    return {
      game: {},
      placedShips: [],
      user: JSON.parse(localStorage.getItem("user")) || null
    };
  },
  computed: {
    shipsRequired() {
      return this.game.language === "fr" ? 5 : 10;
    },
    shipsLeft() {
      return this.shipsRequired - this.placedShips.length;
    }
  },
  async created() {
    const res = await fetch(`http://localhost:3000/api/games/${this.gameId}`);
    const data = await res.json();

    if (data.success) {
      this.game = data.game;

      // Si la BDD n'a pas la langue, on prend celle du localStorage
      if (!this.game.language) {
        this.game.language = localStorage.getItem("currentLanguage") || 'fr';
      }
    } else {
      alert("Partie introuvable !");
      this.$router.push("/gamemode");
    }
  },
  methods: {
    placeShip(cell) {
      if (this.placedShips.includes(cell)) {
        this.placedShips = this.placedShips.filter(c => c !== cell);
      } else if (this.placedShips.length < this.shipsRequired) {
        this.placedShips.push(cell);
      }
    },
    async confirmPlacement() {
      try {
        const res = await fetch("http://localhost:3000/api/games/place-ships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: this.game.ID_Game,
            playerId: this.user.id,
            ships: this.placedShips
          })
        });
        const data = await res.json();
        if (data.success) {
          alert("Placement validé !");
          this.$router.push(`/game/${this.game.ID_Game}`);
        }
      } catch (err) {
        console.error("Erreur confirmPlacement :", err);
      }
    }
  }
};
</script>

<style scoped>
.place-ships-container {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  min-height: 100vh;
}
.grid {
  display: grid;
  grid-template-columns: repeat(10, 30px);
  grid-template-rows: repeat(10, 30px);
  gap: 2px;
  margin: 1rem auto;
  width: max-content;
}
.cell {
  width: 30px;
  height: 30px;
  background: #34495e;
  border: 1px solid #2c3e50;
  cursor: pointer;
}
.cell.ship {
  background: #27ae60;
}
</style>
