<template>
  <div class="background profile-page">
    <div class="profile-card">
      <button @click="$router.push('/')" class="btn-icon-back" title="Retour au menu">
        <span class="icon">⬅</span>
      </button>

      <h1 class="profile-title">MON PROFIL</h1>

      <div class="profile-content">
        <div class="avatar-section">
          <div class="avatar-main">
            <img :src="avatarPreviewUrl" alt="Aperçu" class="main-img" />
          </div>
          <p class="section-label">Choisir un avatar</p>

          <div class="avatar-grid-container">
            <div class="avatar-grid">
              <div
                v-for="av in avatars"
                :key="av.ID_Avatar"
                class="avatar-option"
                :class="{ selected: avatar === av.ID_Avatar }"
                @click="selectAvatar(av.ID_Avatar)"
              >
                <img :src="'data:' + av.mime_type + ';base64,' + av.Avatar" />
              </div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="input-group">
            <label>NOM DE CODE (PSEUDO)</label>
            <input
              v-model="pseudo"
              type="text"
              placeholder="Entrez votre pseudo..."
              maxlength="15"
            />
          </div>

          <div class="action-buttons">
            <button @click="saveProfile" class="btn btn-save">
              <span class="icon">💾</span> ENREGISTRER
            </button>

            <div class="danger-zone">
              <button @click="deleteAccount" class="btn-delete">
                Supprimer mon compte définitivement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { userBus } from "@/eventBus.js";
import axios from "axios";

const defaultAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR42u3PAQ0AAAwCoNm/9HI4gAAAAAAAAAAAOBwG4cAAfNmS7sAAAAASUVORK5CYII=";

export default {
  data() {
    return {
      pseudo: "",
      userId: null,
      avatars: [],
      avatar: null,
      avatarPreviewUrl: defaultAvatar,
    };
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      this.userId = user.id;
      this.pseudo = user.pseudo;
      this.avatar = user.avatarId || null;
      this.avatarPreviewUrl = user.avatar || defaultAvatar;
    }
    this.fetchAvatars();
  },
  methods: {
    async fetchAvatars() {
      try {
        const res = await axios.get("https://battleship-api-i276.onrender.com/api/avatars");
        this.avatars = res.data.avatars;
        if (this.avatar) {
          const sel = this.avatars.find((a) => a.ID_Avatar === this.avatar);
          if (sel) this.avatarPreviewUrl = `data:${sel.mime_type};base64,${sel.Avatar}`;
        }
      } catch (e) {
        console.error("Erreur récupération avatars :", e);
      }
    },
    selectAvatar(id) {
      this.avatar = id;
      const sel = this.avatars.find((a) => a.ID_Avatar === id);
      if (sel) this.avatarPreviewUrl = `data:${sel.mime_type};base64,${sel.Avatar}`;
    },
    async saveProfile() {
      if (!this.userId) return;
      const payload = { pseudo: this.pseudo };
      if (this.avatar) payload.avatar = this.avatar;

      try {
        const response = await fetch(
          `https://battleship-api-i276.onrender.com/api/users/${this.userId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) throw new Error(await response.text());
        const updatedUser = await response.json();
        this.avatarPreviewUrl = updatedUser.avatar || defaultAvatar;
        this.pseudo = updatedUser.pseudo;
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: updatedUser.id,
            pseudo: updatedUser.pseudo,
            avatarId: updatedUser.avatarId,
            avatar: updatedUser.avatar,
          }),
        );
        userBus.userUpdated = !userBus.userUpdated;
        alert("Profil mis à jour !");
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la mise à jour du profil.");
      }
    },
    async deleteAccount() {
      if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) return;
      try {
        const response = await fetch(
          `https://battleship-api-i276.onrender.com/api/users/${this.userId}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) throw new Error(await response.text());
        localStorage.removeItem("user");
        userBus.userUpdated = !userBus.userUpdated;
        alert("Compte supprimé !");
        this.$router.push("/");
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression du compte.");
      }
    },
  },
};
</script>

<style scoped>
/* Conteneur principal figé */
.profile-page {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* Empêche tout scroll sur la page */
  display: flex;
  justify-content: center;
  align-items: center;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)),
    url("@/assets/images/BackGroundAccueil.png");
  background-size: cover;
  background-position: center;
}

.info-section,
.section-label {
  color: white;
}

.profile-card {
  background: rgba(13, 27, 42, 0.9);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 24px;
  width: 90%;
  max-width: 500px; /* Légèrement réduit pour éviter le débordement */
  max-height: 90vh; /* Empêche la carte de dépasser de l'écran */
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  display: flex;
  flex-direction: column;
}

.profile-title {
  text-align: center;
  font-size: 1.8rem;
  letter-spacing: 3px;
  margin-bottom: 20px;
  color: white;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden; /* Verrouille le contenu interne */
}

/* --- Avatar Section --- */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid #3498db;
  object-fit: cover;
  margin-bottom: 10px;
}

.avatar-grid-container {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 15px;
}

.avatar-grid {
  display: flex;
  overflow-x: auto; /* Seul le choix d'avatar peut défiler horizontalement */
  gap: 10px;
  padding: 5px;
}

/* Style de la scrollbar interne pour rester discret */
.avatar-grid::-webkit-scrollbar {
  height: 4px;
}
.avatar-grid::-webkit-scrollbar-thumb {
  background: #3498db;
  border-radius: 10px;
}

.avatar-option {
  flex: 0 0 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 2px solid transparent;
  transition: 0.2s;
}

.avatar-option.selected {
  border-color: #3498db;
  transform: scale(1.1);
}

.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- Info Section --- */
input[type="text"] {
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 12px;
  border-radius: 10px;
  color: white;
  text-align: center;
}

.btn {
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.btn-save {
  background: #1abc9c;
  color: white;
}

.btn-delete {
  background: transparent;
  color: #e74c3c;
  font-size: 0.8rem;
  text-decoration: underline;
  cursor: pointer;
  border: none;
  margin-top: 10px;
}

.btn-icon-back {
  position: absolute;
  top: 15px;
  left: 15px;
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}
</style>
