<template>
  <div class="profile-container">
    <div class="profile-form">
      <!-- Aperçu -->
      <label>Avatar</label>
      <div class="avatar-preview">
        <img :src="avatarPreviewUrl" alt="Avatar actuel" />
      </div>

      <!-- Sélection des avatars depuis la BDD -->
      <div class="avatar-selection">
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

      <label>Pseudo</label>
      <input v-model="pseudo" type="text" placeholder="Votre pseudo" />

      <div class="buttons">
        <button @click="saveProfile" class="save-button">💾 Enregistrer</button>
        <button @click="deleteAccount" class="delete-button">🗑️ Supprimer le compte</button>
        <button @click="$router.push('/')" class="back-button">⬅ Retour au menu</button>
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
        const res = await axios.get("http://localhost:8080/api/avatars");
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
        const response = await fetch(`http://localhost:8080/api/users/${this.userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
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
          })
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
        const response = await fetch(`http://localhost:8080/api/users/${this.userId}`, {
          method: "DELETE",
        });
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
.profile-container {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
}

.profile-container h1 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-shadow: 1px 1px 4px #000;
}

.profile-form {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(6px);
  padding: 2rem;
  border-radius: 20px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid #3498db;
  object-fit: cover;
  margin-bottom: 1rem;
  transition: transform 0.2s;
}
.avatar-preview img:hover {
  transform: scale(1.05);
}

.avatar-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.avatar-option {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}
.avatar-option.selected {
  border-color: #ffd700;
  transform: scale(1.1);
}
.avatar-option img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

input[type="text"] {
  width: 100%;
  padding: 0.6rem;
  border-radius: 10px;
  border: none;
  margin-bottom: 1rem;
  outline: none;
  font-size: 1rem;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

button {
  padding: 0.6rem;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.save-button {
  background: linear-gradient(to right, #1abc9c, #16a085);
  color: white;
}
.save-button:hover {
  background: linear-gradient(to right, #16a085, #138d75);
}

.delete-button {
  background: linear-gradient(to right, #e74c3c, #c0392b);
  color: white;
}
.delete-button:hover {
  background: linear-gradient(to right, #c0392b, #992d22);
}

.back-button {
  background: linear-gradient(to right, #3498db, #2980b9);
  color: white;
}
.back-button:hover {
  background: linear-gradient(to right, #2980b9, #21618c);
}
</style>
