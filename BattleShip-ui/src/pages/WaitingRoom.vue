<!--WaitingRoom.vue-->

<template>
  <div class="waiting-room">
    <h1>En attente d'autres joueurs...</h1>
    <ul>
        <li v-for="player in currentPlayers" :key="player.id">{{ player.pseudo }}</li>
    </ul>

    <p>{{ currentPlayers.length }} / {{ totalPlayers }}</p>
    <div v-if="isReady">
      <router-link :to="`/game/${gameId}`">➡️ Démarrer la partie</router-link>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      gameId: this.$route.params.gameId,
      currentPlayers: [],
      totalPlayers: 2,
      isReady: false
    };
  },
  created() {
    this.checkStatus();
    this.interval = setInterval(this.checkStatus, 2000);
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  methods: {
    checkStatus() {
      fetch(`http://localhost:3000/api/game-status/${this.gameId}`)
        .then(res => res.json())
        .then(data => {
          this.currentPlayers = data.players;
          this.totalPlayers = data.totalPlayers;
          this.isReady = data.status === 'ready';
        });
    }
  }
};
</script>
