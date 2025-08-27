<template>
  <div class="background">
    <div class="game-menu">
      <div v-if="!user">
        <AuthForm @login-success="handleLoginSuccess" />
      </div>
      <div v-else>
        <header class="top-bar">
          <!-- Bouton ajouter ami -->
          <div class="add-friend">
            <button @click="openFriendsPopup">➕ Amis</button>
          </div>

          <!-- Infos utilisateur -->
          <div class="user-info" @click="toggleUserMenu">
            <img :src="'data:image/png;base64,' + user.avatar" class="avatar" />
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

        <!-- Popup Jouer -->
        <div v-if="showPopup" class="popup-overlay">
          <div class="popup-content">
            <h2>JOUER</h2>
            <button class="join-button">Rejoindre</button>
            <button class="create-button" @click="goToGameMode">Créer</button>
            <button class="back-button" @click="closePopup">Retour</button>
          </div>
        </div>

        <!-- Popup Amis -->
        <div v-if="showFriendsPopup" class="popup-overlay">
          <div class="popup-content">
            <h2>👥 Mes amis</h2>

            <!-- Liste d'amis -->
            <h3>Amis</h3>
            <ul v-if="friends.length > 0">
              <li v-for="friend in friends" :key="friend.id">
                {{ friend.pseudo }} ({{ friend.email }})
              </li>
            </ul>
            <p v-else>Aucun ami enregistré</p>

            <!-- Liste des demandes reçues -->
            <h3>Demandes reçues</h3>
            <ul v-if="requests.length > 0">
              <li v-for="req in requests" :key="req.id">
                {{ req.pseudo }}
                <button @click="acceptRequest(req.id)">✅ Accepter</button>
              </li>
            </ul>
            <p v-else>Aucune demande</p>

            <!-- Formulaire ajout d'ami -->
            <div class="add-friend-form">
              <input v-model="friendIdentifier" placeholder="Pseudo ou Email" />
              <button @click="addFriend">Ajouter</button>
            </div>

            <button class="back-button" @click="closeFriendsPopup">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AuthForm from '../components/AuthForm.vue';
import logo from '@/assets/images/BATTLESHIPLOGO.png';
import { useRouter } from 'vue-router';
import { eventBus } from '@/eventBus';
import { watch } from 'vue';

export default {
  components: { AuthForm },
  data() {
    return {
      user: null,
      userDetails: null,
      logo,
      showUserMenu: false,
      showPopup: false,
      showFriendsPopup: false,
      friends: [],
      requests: [],
      friendIdentifier: ""
    };
  },
  setup() {
    const router = useRouter();
    return { router };
  },
  created() {
    this.refreshUserFromStorage();

    watch(() => eventBus.userUpdated, () => {
      this.refreshUserFromStorage();
    });
  },
  methods: {
    refreshUserFromStorage() {
      const savedUser = localStorage.getItem('user');
      this.user = savedUser ? JSON.parse(savedUser) : null;
    },
    startGame() {
      this.showPopup = true;
    },
    closePopup() {
      this.showPopup = false;
    },
    goToGameMode() {
      this.$router.push('/gamemode');
    },
    showRules() {
      this.router.push('/rules');
    },
    handleLoginSuccess(userData) {
      this.user = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      this.fetchUserDetails(userData.id);
    },
    async fetchUserDetails(userId) {
      if (!userId) return;

      try {
        const response = await fetch(`http://localhost:3000/api/users/${userId}`);
        const data = await response.json();
        this.userDetails = data;
        this.user = data;
        localStorage.setItem('user', JSON.stringify(data));
      } catch (error) {
        console.error('Erreur récupération user complet :', error);
      }
    },

    /* --- Amis --- */
    openFriendsPopup() {
      this.showFriendsPopup = true;
      this.fetchFriends();
    },
    closeFriendsPopup() {
      this.showFriendsPopup = false;
    },
    async fetchFriends() {
      try {
        // Liste amis confirmés
        const response = await fetch(`http://localhost:3000/api/friends/${this.user.id}`);
        this.friends = await response.json();

        // Liste demandes reçues
        const req = await fetch(`http://localhost:3000/api/friends/requests/${this.user.id}`);
        this.requests = await req.json();
      } catch (e) {
        console.error("Erreur récupération amis :", e);
      }
    },
    async addFriend() {
      if (!this.friendIdentifier) return;
      try {
        const response = await fetch(`http://localhost:3000/api/friends/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: this.user.id,
            identifier: this.friendIdentifier
          })
        });
        if (response.ok) {
          this.friendIdentifier = "";
          this.fetchFriends();
        } else {
          alert("Utilisateur introuvable ou erreur ajout.");
        }
      } catch (e) {
        console.error("Erreur ajout ami :", e);
      }
    },
    async acceptRequest(friendId) {
      try {
        await fetch("http://localhost:3000/api/friends/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.user.id, friendId })
        });
        this.fetchFriends();
      } catch (e) {
        console.error("Erreur acceptation ami :", e);
      }
    },

    logout() {
      this.user = null;
      this.userDetails = null;
      localStorage.removeItem('user');
    },
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu;
    },
    viewProfile() {
      this.router.push('/profile');
    },
    goToSettings() {
      alert("Redirection vers les paramètres (à développer)");
    }
  }
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
</style>
