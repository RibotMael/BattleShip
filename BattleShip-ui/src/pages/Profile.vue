<!--Profile.vue-->
<template>
  <div class="profile-container">
    <h1>👤 Mon Profil</h1>

    <div class="profile-form">
      <label>Avatar</label>
      <div class="avatar-preview">
        <img :src="avatarPreviewUrl" alt="Avatar actuel" />
      </div>

      <div class="avatar-upload">
        <label class="custom-file-upload">
          📁 Choisir un fichier
          <input type="file" @change="handleAvatarChange" accept="image/*" />
        </label>
      </div>

      <label>Pseudo</label>
      <input v-model="pseudo" type="text" />

      <button @click="saveProfile">💾 Enregistrer</button>
      <button @click="deleteAccount" class="delete-button">🗑️ Supprimer le compte</button>
      <button @click="$router.push('/')" class="back-button">Retour au menu</button>
    </div>
  </div>
</template>

<script>
import { eventBus } from '@/eventBus';
import defaultAvatar from '@/assets/images/ppHomme.png';

export default {
  data() {
    return {
      pseudo: '',
      avatarFile: null,
      avatarPreviewUrl: defaultAvatar,
      userId: null
    };
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      this.userId = user.id;
      this.pseudo = user.pseudo;
      this.avatarPreviewUrl = user.avatar || defaultAvatar;
    }
  },
  methods: {
    handleAvatarChange(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) return alert("L'image est trop lourde (max 500 Ko)");

      this.avatarFile = file;
      this.avatarPreviewUrl = URL.createObjectURL(file);
      event.target.value = null;
    },

    async saveProfile() {
      if (!this.userId) return;

      let avatarBase64 = null;
      let mimeType = null;

      if (this.avatarFile) {
        avatarBase64 = await this.fileToBase64(this.avatarFile);
        mimeType = this.avatarFile.type; // ✅ "image/png", "image/jpeg", etc.
      }

      const payload = {
        pseudo: this.pseudo,
        avatar: avatarBase64,
        mimeType
      };

      try {
        const response = await fetch(`http://localhost:3000/api/users/${this.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erreur API :", errText);
          return alert("Erreur lors de la mise à jour du profil.");
        }

        const updatedUser = await response.json();

        localStorage.setItem('user', JSON.stringify({
          id: updatedUser.id,
          pseudo: updatedUser.pseudo,
          avatar: updatedUser.avatar || defaultAvatar
        }));



        this.avatarPreviewUrl = updatedUser.avatar || defaultAvatar;
        this.pseudo = updatedUser.pseudo;
        eventBus.userUpdated = !eventBus.userUpdated;

        alert("Profil mis à jour !");
      } catch (error) {
        console.error("Erreur API :", error);
        alert("Erreur inattendue lors de la mise à jour du profil.");
      }
    },

    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // ✅ uniquement la partie base64
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    async deleteAccount() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) return;

      try {
        const response = await fetch(`http://localhost:3000/api/admin/users/${user.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erreur serveur :", errText);
          return alert("Erreur lors de la suppression du compte.");
        }

        localStorage.removeItem('user');
        eventBus.userUpdated = !eventBus.userUpdated;

        alert("Votre compte a été supprimé.");
        this.$router.push('/');
      } catch (error) {
        console.error("Erreur lors de la suppression :", error);
        alert("Erreur inattendue lors de la suppression.");
      }
    }
  }
};
</script>

<style scoped>
.profile-container {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  min-height: 100vh;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-form {
  background: white;
  color: black;
  padding: 1rem;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.profile-form label {
  font-weight: bold;
  margin-top: 0.5rem;
  display: block;
}

.profile-form input[type="text"],
.profile-form input[type="file"] {
  width: 100%;
  margin-top: 0.3rem;
  padding: 0.4rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.avatar-preview img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.5rem;
}

.avatar-upload input[type="file"] { display: none; }

.custom-file-upload {
  display: inline-block;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.custom-file-upload:hover { background-color: #2980b9; }

.profile-form button {
  margin-bottom: 0.5rem;
  background-color: #2980b9;
  color: white;
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
}

.profile-form button:hover { background-color: #216f9d; }

.delete-button { background-color: #e74c3c; }
.delete-button:hover { background-color: #c0392b; }
</style>
