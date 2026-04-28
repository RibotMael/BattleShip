<template>
  <div class="background" :style="backgroundStyle">
    <div class="game-menu">
      <div v-if="!user" class="auth-wrapper">
        <AuthForm @login-success="handleLoginSuccess" />
      </div>

      <div v-else class="menu-container">
        <header class="top-bar">
          <div class="left-section">
            <button @click="openFriendsPopup" class="btn-friends">
              <span class="icon-wrap">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </span>
              <span class="btn-label">{{ i18nStore.t("menu_friends") }}</span>
              <span v-if="invitationCount > 0" class="invite-badge">{{ invitationCount }}</span>
            </button>
          </div>

          <div class="right-section">
            <div class="player-stats">
              <div class="stat-pill gold-pill" title="Or">
                <span class="pill-icon">🪙</span>
                <span class="pill-value">{{ user.gold ?? 0 }}</span>
              </div>
              <div class="stat-pill level-pill" title="Niveau">
                <div class="level-info">
                  <span class="level-text"
                    >{{ i18nStore.t("menu_level") }} {{ levelInfo.level }}</span
                  >
                  <div class="mini-xp-track">
                    <div class="mini-xp-fill" :style="{ width: xpPercent + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="user-trigger" @click="toggleUserMenu" :class="{ active: showUserMenu }">
              <span class="pseudo">{{ user.pseudo }}</span>
              <div class="avatar-wrap">
                <img :src="avatarSrc" class="avatar-img" />
              </div>
            </div>

            <transition name="dropdown">
              <div v-if="showUserMenu" class="user-dropdown">
                <button @click="viewProfile">
                  <span class="icon">👤</span> {{ i18nStore.t("menu_profile") }}
                </button>
                <button @click="goToSettings">
                  <span class="icon">⚙️</span> {{ i18nStore.t("menu_settings") }}
                </button>
                <div class="dropdown-divider"></div>
                <button @click="logout" class="logout-btn">
                  <span class="icon">🔓</span> {{ i18nStore.t("menu_logout") }}
                </button>
              </div>
            </transition>
          </div>
        </header>

        <main class="menu-content">
          <div class="logo-container">
            <img :src="logo" alt="Battleship" class="menu-logo" />
          </div>

          <transition name="view-slide" mode="out-in">
            <div v-if="!showPlayOptions" class="button-stack" key="main">
              <button class="btn-cyber btn-primary" @click="showPlayOptions = true">
                <span class="btn-text">{{ i18nStore.t("menu_deploy") }}</span>
                <span class="btn-glitch"></span>
              </button>
              <button class="btn-cyber btn-secondary" @click="showRules">
                {{ i18nStore.t("menu_rules") }}
              </button>
              <!-- ── NOUVEAU BOUTON SKINS ── -->
              <button class="btn-cyber btn-skins" @click="goToShop">
                <span class="btn-skins-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    <path d="M4.93 4.93a10 10 0 0 0 0 14.14"></path>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M8.46 8.46a5 5 0 0 0 0 7.07"></path>
                  </svg>
                </span>
                {{ i18nStore.t("menu_skins") || "SKINS" }}
              </button>
            </div>

            <div v-else class="button-stack" key="play">
              <button class="btn-cyber btn-primary" @click="goToCreate">
                {{ i18nStore.t("menu_create") }}
              </button>
              <button class="btn-cyber btn-secondary" @click="goToJoin">
                {{ i18nStore.t("menu_join") }}
              </button>
              <button class="btn-back" @click="showPlayOptions = false">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M19 12H5M5 12L12 19M5 12L12 5" />
                </svg>
                {{ i18nStore.t("menu_back") }}
              </button>
            </div>
          </transition>
        </main>

        <FriendsPopup v-if="showFriendsPopup" :userId="user.id" @close="closeFriendsPopup" />
      </div>
    </div>
  </div>
</template>

<script>
import AuthForm from "../components/AuthForm.vue";
import FriendsPopup from "../components/FriendsPopup.vue";
import logo from "@/assets/images/BATTLESHIPLOGO.png";
import { invitationStore, userBus } from "@/eventBus.js";
import { watch } from "vue";
import { i18nStore } from "@/stores/i18n";

const defaultAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR42u3PAQ0AAAwCoNm/9HI4gAAAAAAAAAAAOBwG4cAAfNmS7sAAAAASUVORK5CYII=";

const avatarImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Avatar/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

const backgroundImgs = Object.fromEntries(
  Object.entries(
    import.meta.glob("../assets/Bataille_Navale_Assets-main/Background/*.png", { eager: true }),
  ).map(([path, mod]) => [path.split("/").pop(), mod.default]),
);

export default {
  components: { AuthForm, FriendsPopup },
  data() {
    return {
      user: null,
      logo,
      showUserMenu: false,
      showFriendsPopup: false,
      showPlayOptions: false,
      avatarPreviewUrl: defaultAvatar,
      i18nStore,
    };
  },
  computed: {
    backgroundStyle() {
      const folder = this.user?.activeFondFolder ?? "";
      const key = folder ? `Accueil${folder}.png` : "Accueil.png";
      const img = backgroundImgs[key] || backgroundImgs["Accueil.png"] || "";
      return {
        backgroundImage: `linear-gradient(rgba(3, 10, 16, 0.8), rgba(3, 10, 16, 0.85)), url("${img}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    },
    avatarSrc() {
      if (!this.user) return defaultAvatar;
      const prefix = this.user.activeAvatarPrefix ?? "";
      const avatarId = this.user.avatarId || 1;
      if (prefix) {
        return avatarImgs[`${avatarId}${prefix}.png`] || this.user.avatar || defaultAvatar;
      }
      return this.user.avatar || defaultAvatar;
    },
    invitationCount() {
      return invitationStore.invitations.length;
    },
    levelInfo() {
      const totalXp = this.user?.xp ?? 0;
      let level = 0;
      let used = 0;
      while (true) {
        const needed = Math.floor(100 * Math.pow(1.02, level));
        if (used + needed > totalXp) {
          return { level, xpInto: totalXp - used, needed };
        }
        used += needed;
        level++;
      }
    },
    xpPercent() {
      const { xpInto, needed } = this.levelInfo;
      if (!needed) return 0;
      return Math.min(100, Math.floor((xpInto / needed) * 100));
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
      if (userData.level === undefined) userData.level = userData.niveau ?? 0;
      if (userData.gold === undefined) userData.gold = userData.gold ?? 0;
      if (userData.xp === undefined) userData.xp = 0;
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
    goToShop() {
      this.$router.push("/shop");
    }, // ← nouvelle route
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap");

.background {
  position: fixed;
  inset: 0;
  font-family: "Inter", sans-serif;
}

.menu-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ── TOP BAR ── */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(0px);
  z-index: 100;
}

.btn-friends {
  background: rgba(29, 233, 192, 0.05);
  border: 1px solid rgba(29, 233, 192, 0.2);
  color: #1de9c0;
  padding: 0.75rem 1.25rem;
  font-size: 1.1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-family: "Rajdhani", sans-serif;
  font-weight: 600;
  transition: all 0.2s;
  position: relative;
}
.btn-friends svg {
  width: 24px;
  height: 24px;
}
.btn-friends:hover {
  background: rgba(29, 233, 192, 0.15);
  box-shadow: 0 0 15px rgba(29, 233, 192, 0.2);
}

.invite-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #f87171;
  color: white;
  font-size: 0.85rem;
  padding: 3px 8px;
  border-radius: 12px;
  border: 2px solid #06121a;
}

.player-stats {
  display: flex;
  gap: 12px;
  margin-right: 20px;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}
.gold-pill {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}
.level-pill {
  border-color: rgba(29, 233, 192, 0.3);
}
.pill-value {
  font-weight: 600;
  font-size: 0.9rem;
}
.level-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.level-text {
  font-family: "Rajdhani", sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #1de9c0;
}
.mini-xp-track {
  width: 60px;
  height: 3px;
  background: rgba(29, 233, 192, 0.1);
  border-radius: 2px;
}
.mini-xp-fill {
  height: 100%;
  background: #1de9c0;
  box-shadow: 0 0 5px #1de9c0;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 6px 6px 6px 16px;
  border-radius: 35px;
  transition: background 0.2s;
  border: 1px solid transparent;
}
.user-trigger:hover,
.user-trigger.active {
  background: rgba(29, 233, 192, 0.08);
  border-color: rgba(29, 233, 192, 0.1);
}
.pseudo {
  color: #dff2ee;
  font-weight: 600;
  font-size: 1.1rem;
}
.avatar-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #1de9c0;
  padding: 2px;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 15px);
  right: 1.5rem;
  width: 240px;
  background: rgba(10, 25, 47, 0.95);
  border: 1px solid rgba(29, 233, 192, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(15px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  padding: 10px;
}
.user-dropdown button {
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  color: #c0ddd8;
  text-align: left;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-dropdown button:hover {
  background: rgba(29, 233, 192, 0.1);
  color: #1de9c0;
}
.dropdown-divider {
  height: 1px;
  background: rgba(29, 233, 192, 0.1);
  margin: 6px 0;
}
.logout-btn {
  color: #f87171 !important;
}

/* ── MAIN CONTENT ── */
.menu-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 5vh;
}

.logo-container {
  margin-bottom: 3rem;
  perspective: 1000px;
}
.menu-logo {
  width: 80vw;
  filter: drop-shadow(0 0 30px rgba(29, 233, 192, 0.2));
  animation: logo-float 4s ease-in-out infinite;
}
@keyframes logo-float {
  0%,
  100% {
    transform: translateY(0) rotateX(5deg);
  }
  50% {
    transform: translateY(-15px) rotateX(10deg);
  }
}

.button-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 320px;
}

.btn-cyber {
  position: relative;
  padding: 1.1rem;
  font-family: "Rajdhani", sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  transition: all 0.3s;
  overflow: hidden;
}

.btn-primary {
  background: #1de9c0;
  color: #030a10;
  box-shadow: 0 0 20px rgba(29, 233, 192, 0.3);
}
.btn-primary:hover {
  background: #14c9a5;
  box-shadow: 0 0 30px rgba(29, 233, 192, 0.5);
  transform: scale(1.02);
}

.btn-secondary {
  background: rgba(29, 233, 192, 0.05);
  color: #1de9c0;
  border: 1px solid rgba(29, 233, 192, 0.3);
}
.btn-secondary:hover {
  background: rgba(29, 233, 192, 0.15);
  border-color: #1de9c0;
}

/* ── BOUTON SKINS ── */
.btn-skins {
  background: rgba(168, 85, 247, 0.07);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-skins:hover {
  background: rgba(168, 85, 247, 0.18);
  border-color: #c084fc;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.25);
  transform: scale(1.02);
}
.btn-skins-icon {
  display: flex;
  align-items: center;
}

.btn-back {
  background: none;
  border: none;
  color: #2e6b62;
  font-family: "Rajdhani", sans-serif;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 10px;
  transition: color 0.2s;
}
.btn-back:hover {
  color: #f87171;
}

/* ── TRANSITIONS ── */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease-out;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.view-slide-enter-active,
.view-slide-leave-active {
  transition: all 0.3s ease;
}
.view-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.view-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ── MOBILE ── */
@media (max-width: 600px) {
  .btn-label,
  .pseudo {
    display: none;
  }
  .top-bar {
    padding: 0.5rem 1rem;
  }
  .player-stats {
    margin-right: 10px;
  }
  .menu-logo {
    max-width: 300px;
  }
}
</style>
