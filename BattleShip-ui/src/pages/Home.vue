<template>
  <div class="background">
    <div class="game-menu">
      <div v-if="!user" class="auth-wrapper">
        <AuthForm @login-success="handleLoginSuccess" />
      </div>

      <div v-else class="menu-container">
        <header class="top-bar">
          <div class="left-section">
            <button @click="openFriendsPopup" class="btn-friends">
              <span class="icon">➕</span>
              <span class="btn-label">Amis</span>
              <span v-if="invitationCount > 0" class="invite-count">{{ invitationCount }}</span>
            </button>
          </div>

          <div class="right-section">
            <div class="user-info" @click="toggleUserMenu">
              <span class="pseudo">{{ user.pseudo }}</span>
              <img :src="avatarSrc" class="avatar" />
            </div>

            <transition name="fade-slide">
              <div v-if="showUserMenu" class="user-dropdown">
                <button @click="viewProfile">👤 Voir le profil</button>
                <button @click="goToSettings">⚙️ Paramètres</button>
                <div class="divider"></div>
                <button @click="logout" class="logout-btn">🔓 Déconnexion</button>
              </div>
            </transition>
          </div>
        </header>

        <main class="menu-content">
          <div class="logo-wrapper">
            <img :src="logo" alt="Logo" class="menu-logo" />
          </div>

          <transition name="scale-fade" mode="out-in">
            <div v-if="!showPlayOptions" class="button-group" key="main">
              <button class="btn-main play-btn" @click="showPlayOptions = true">Jouer</button>
              <button class="btn-main rules-btn" @click="showRules">Règles du jeu</button>
            </div>

            <div v-else class="button-group" key="play">
              <button class="btn-main create-btn" @click="goToCreate">Créer une partie</button>
              <button class="btn-main join-btn" @click="goToJoin">Rejoindre une partie</button>
              <button class="btn-main back-btn" @click="showPlayOptions = false">Retour</button>
            </div>
          </transition>
        </main>

        <FriendsPopup v-if="showFriendsPopup" :userId="user.id" @close="closeFriendsPopup" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-size: cover;
  background-position: center;
}

.game-menu {
  width: 100%;
  height: 100%;
}

.menu-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  font-family: "Orbitron", sans-serif;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  box-sizing: border-box;
}

.left-section {
  justify-content: flex-start;
}

.right-section {
  justify-content: flex-end;
  position: relative;
}

.btn-friends {
  border: 1px solid #00d4ff;
  padding: 0.7rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: 0.3s;
  position: relative;
  white-space: nowrap;
}

.btn-friends:hover {
  background: #00d4ff;
  color: #000;
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.6);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 30px;
  transition: background 0.2s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pseudo {
  color: rgb(0, 0, 0);
  font-weight: bold;
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 2px solid #00d4ff;
  object-fit: cover;
}

.user-dropdown {
  position: absolute;
  top: 65px;
  right: 0;
  background: rgba(10, 25, 47, 0.95);
  border: 1px solid #00d4ff;
  border-radius: 12px;
  width: 220px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.9);
  z-index: 1000;
  overflow: hidden;
}

.user-dropdown button {
  width: 100%;
  padding: 1.2rem;
  background: transparent;
  border: none;
  color: white;
  text-align: left;
  cursor: pointer;
  font-family: "Orbitron", sans-serif;
  transition: background 0.2s;
}

.user-dropdown button:hover {
  background: rgba(0, 212, 255, 0.2);
}

.divider {
  height: 1px;
  background: rgba(0, 212, 255, 0.2);
}
.logout-btn {
  color: #ff4d4d !important;
}

.menu-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.menu-logo {
  max-width: 1000px;
  width: 200vw;
  margin-bottom: 4rem;
  filter: drop-shadow(0 0 25px rgba(0, 212, 255, 0.5));
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  width: 100%;
  max-width: 350px;
}

.btn-main {
  width: 100%;
  padding: 1.3rem;
  border: none;
  border-radius: 10px;
  font-size: 1.2rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  font-family: "Orbitron", sans-serif;
}

.play-btn {
  background: linear-gradient(135deg, #00d4ff, #0077cc);
  box-shadow:
    0 5px 0 #005fa3,
    0 10px 25px rgba(0, 212, 255, 0.4);
}

.rules-btn {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  box-shadow:
    0 5px 0 #a05d13,
    0 10px 25px rgba(243, 156, 18, 0.3);
}

.create-btn {
  background: #1abc9c;
  box-shadow: 0 5px 0 #148f77;
}
.join-btn {
  background: #3498db;
  box-shadow: 0 5px 0 #217dbb;
}
.back-btn {
  background: #444;
  box-shadow: 0 5px 0 #222;
  margin-top: 1rem;
}

.btn-main:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
}

.btn-main:active {
  transform: translateY(2px);
  box-shadow: none;
}

.invite-count {
  background: #ff4444;
  color: white;
  font-size: 0.75rem;
  padding: 3px 7px;
  border-radius: 50%;
  position: absolute;
  top: -10px;
  right: -10px;
  border: 2px solid #000;
}

@media (max-width: 600px) {
  .top-bar {
    padding: 0.8rem 1rem;
  }
  .btn-label {
    display: none;
  } /* On ne garde que le icône sur mobile */
  /*.pseudo {
    display: none;
  }*/ /* Cache le nom si trop serré */
  .menu-logo {
    max-width: 600px;
    margin-bottom: 3rem;
  }
  .btn-main {
    padding: 1.1rem;
    font-size: 1rem;
  }
  .button-group {
    gap: 1.2rem;
  }
}

/* ANIMATIONS */
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: 0.3s;
}

.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s ease;
}
.scale-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>

<script>
import AuthForm from "../components/AuthForm.vue";
import FriendsPopup from "../components/FriendsPopup.vue";
import logo from "@/assets/images/BATTLESHIPLOGO.png";
import { invitationStore, userBus } from "@/eventBus.js";
import { watch } from "vue";

const defaultAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR42u3PAQ0AAAwCoNm/9HI4gAAAAAAAAAAAOBwG4cAAfNmS7sAAAAASUVORK5CYII=";

export default {
  components: { AuthForm, FriendsPopup },
  data() {
    return {
      user: null,
      logo,
      showUserMenu: false,
      showFriendsPopup: false,
      showPlayOptions: false,
      publicGames: [],
      loadingPublicGames: false,
      joiningMode: false,
      avatarPreviewUrl: defaultAvatar,
    };
  },
  computed: {
    avatarSrc() {
      if (!this.user) return defaultAvatar;
      return this.user.avatar || defaultAvatar;
    },
    invitationCount() {
      return invitationStore.invitations.length;
    },
  },
  created() {
    this.refreshUser();
    watch(
      () => userBus.userUpdated,
      () => this.refreshUser(),
      { immediate: true },
    );
  },
  methods: {
    refreshUser() {
      const savedUser = localStorage.getItem("user");
      this.user = savedUser ? JSON.parse(savedUser) : null;
    },
    handleLoginSuccess(userData) {
      if (!userData.avatar) userData.avatar = defaultAvatar;
      localStorage.setItem("user", JSON.stringify(userData));
      this.user = userData;
    },
    logout() {
      localStorage.removeItem("user");
      this.user = null;
      userBus.userUpdated = !userBus.userUpdated;
      this.$router.push("/");
    },
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    },
    viewProfile() {
      this.$router.push("/profile");
    },
    goToSettings() {
      this.$router.push("/settings");
    },
    goToCreate() {
      this.$router.push("/gamemode");
    },
    showRules() {
      this.$router.push("/rules");
    },
    openFriendsPopup() {
      this.showFriendsPopup = true;
    },
    closeFriendsPopup() {
      this.showFriendsPopup = false;
    },
    goToJoin() {
      this.$router.push("/join");
    },
  },
};
</script>
