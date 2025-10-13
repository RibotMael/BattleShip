<!-- App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>
  <audio id="background-music" autoplay loop>
    <source src="@/assets/audio/SongBattleShip.mp3" type="audio/mp3" />
  </audio>
</template>

<script>
export default {
  mounted() {
    const audio = document.getElementById("background-music");
    audio.volume = 0.5;

    const playMusic = () => {
      audio.play().catch((err) => {
        console.warn("Autoplay bloqué :", err);
      });
      document.removeEventListener("click", playMusic);
    };

    document.addEventListener("click", playMusic);
  },
};
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}

.background {
  background-image: url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-menu {
  width: 100%;
  height: 100%;
  color: white;
  padding: 1rem;
  box-sizing: border-box;
}

.top-bar {
  position: absolute;
  top: 0;
  right: 0;
  padding: 1rem;
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 75px;
  height: 75px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
}

.pseudo {
  font-weight: bold;
  font-size: 2rem;
  color: black;
}

.logout {
  margin-left: 1rem;
  background: #002f4b;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.logout:hover {
  background: #07486e;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.menu-logo {
  width: 200%;
  max-width: 90vw;
  margin-bottom: 2rem;
}

.play-button,
.rules-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  width: 200px;
  transition: background 0.3s;
}

.play-button {
  background-color: #002f4b;
  color: white;
}

.play-button:hover {
  background-color: #07486e;
}

.rules-button {
  background-color: #2980b9;
  color: white;
}

.rules-button:hover {
  background-color: #216f9d;
}
</style>
