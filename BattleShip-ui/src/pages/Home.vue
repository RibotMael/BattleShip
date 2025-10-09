<!--Home.vue-->

<template>
  <div class="background">
    <div class="game-menu">
      <div v-if="!user">
        <!-- Formulaire de connexion -->
        <AuthForm @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <header class="top-bar">
          <div class="add-friend">
            <button @click="openFriendsPopup">
              ➕ Amis
              <span v-if="invitationCount > 0" class="invite-count">{{ invitationCount }}</span>
            </button>
          </div>

          <div class="user-info" @click="toggleUserMenu">
            <img :src="avatarSrc" class="avatar" />
            <span class="pseudo">{{ user.pseudo }}</span>
          </div>

          <transition name="fade-slide">
            <div v-if="showUserMenu" class="user-dropdown">
              <button @click="viewProfile">👤 Voir le profil</button>
              <button @click="goToSettings">⚙️ Paramètres</button>
              <button @click="logout">🔓 Déconnexion</button>
            </div>
          </transition>
        </header>

        <div class="menu-buttons">
          <img :src="logo" alt="Logo" class="menu-logo" />
          <button class="play-button" @click="startGame">Jouer</button>
          <button class="rules-button" @click="showRules">Règles du jeu</button>
        </div>

        <!-- Popups -->
        <FriendsPopup v-if="showFriendsPopup" :userId="user.id" @close="closeFriendsPopup" />
      </div>
    </div>
  </div>
</template>

<script>
import AuthForm from "../components/AuthForm.vue";
import FriendsPopup from "../components/FriendsPopup.vue";
import logo from "@/assets/images/BATTLESHIPLOGO.png";
import { watch } from "vue";
import defaultAvatar from "@/assets/images/ppHomme.png";
import { invitationStore, userBus } from "@/eventBus.js";

export default {
  components: { AuthForm, FriendsPopup },
  data() {
    return {
      user: null,
      logo,
      showUserMenu: false,
      showFriendsPopup: false,
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
      { immediate: true }
    );
  },
  methods: {
    refreshUser() {
      const savedUser = localStorage.getItem("user");
      this.user = savedUser ? JSON.parse(savedUser) : null;
    },

    handleLoginSuccess(userData) {
      if (!userData.avatar) {
        userData.avatar = defaultAvatar;
      }
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
      alert("Redirection vers les paramètres (à développer)");
    },

    startGame() {
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
  },
};
</script>

<style>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  position: relative;
}

.add-friend button {
  background: #0077cc;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.add-friend button:hover {
  background: #005fa3;
}

.add-friend-form {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.add-friend-form input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100px;
  right: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.user-dropdown button {
  padding: 0.7rem 1.5rem;
  width: 200px;
  background: none;
  border: none;
  text-align: left;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.user-dropdown button:hover {
  background: #f0f0f0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  margin-top: 100px;
  opacity: 0;
  transform: translateY(-10px);
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.popup-content {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-width: 360px;
  width: 100%;
  color: white;
}

.popup-content h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #ffffff;
  letter-spacing: 1px;
}

.popup-content h3 {
  font-size: 1.2rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-align: left;
}

.popup-content button {
  display: block;
  width: 100%;
  padding: 0.9rem;
  margin: 0.5rem 0;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popup-content button:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  position: relative;
}

.add-friend button {
  background: #0077cc;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.add-friend button:hover {
  background: #005fa3;
}

.add-friend-form {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.add-friend-form input {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100px;
  right: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.user-dropdown button {
  padding: 0.7rem 1.5rem;
  width: 200px;
  background: none;
  border: none;
  text-align: left;
  font-weight: bold;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
}

.user-dropdown button:hover {
  background: #f0f0f0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  margin-top: 100px;
  opacity: 0;
  transform: translateY(-10px);
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.popup-content {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-width: 360px;
  width: 100%;
  color: white;
}

.popup-content h2 {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #ffffff;
  letter-spacing: 1px;
}

.popup-content h3 {
  font-size: 1.2rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-align: left;
}

.popup-content button {
  display: block;
  width: 100%;
  padding: 0.9rem;
  margin: 0.5rem 0;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popup-content button:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.invite-count {
  background: red;
  color: white;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 50%;
  margin-left: 5px;
  font-size: 0.8rem;
}
</style>
