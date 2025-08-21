<template>
  <div class="profile-container">
    <h1>👤 Mon Profil</h1>

    <div class="profile-form">
      <!-- Affichage actuel de l'avatar -->
      <label>Avatar</label>
      <div class="avatar-preview">
        <img :src="avatarPreview ? 'data:image/png;base64,' + avatarPreview : '/images/default-avatar.png'" alt="Avatar actuel" />
      </div>

      <!-- Upload d'un nouveau fichier image -->
      <div class="avatar-upload">
        <label class="custom-file-upload">
          📁 Choisir un fichier
          <input type="file" @change="handleAvatarChange" accept="image/*" />
        </label>
      </div>

      <!-- Modification du pseudo -->
      <label>Pseudo</label>
      <input v-model="pseudo" type="text" />

      <!-- Bouton pour enregistrer les changements -->
      <button @click="saveProfile">💾 Enregistrer</button>

      <!-- Suppression du compte -->
      <button @click="deleteAccount" class="delete-button">🗑️ Supprimer le compte</button>

      <!-- Retour au menu principal -->
      <button @click="$router.push('/')" class="back-button">Retour au menu</button>
    </div>
  </div>
</template>

<script>
import { eventBus } from '@/eventBus';

export default {
  data() {
    return {
      pseudo: '',
      avatarPreview: '',
      avatarFile: null
    };
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      this.pseudo = user.pseudo;
      this.avatarPreview = user.avatar;
    }
  },
  methods: {
    handleAvatarChange(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 500 * 1024) {
          alert("L'image est trop lourde (max 500 Ko)");
          event.target.value = null;
          return;
        }

        this.avatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result.split(',')[1];
          this.avatarPreview = base64Data;
        };
        reader.readAsDataURL(file);

        // Reset input pour pouvoir sélectionner à nouveau le même fichier si besoin
        event.target.value = null;
      }
    },

    removeAvatar() {
      this.avatarPreview = '';
    },

    async saveProfile() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) return;

      const updatedData = {
        pseudo: this.pseudo,
        avatar: this.avatarPreview
      };

      try {
        const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
          alert("Erreur lors de la mise à jour du profil.");
          return;
        }

        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Déclencher la mise à jour réactive
        eventBus.userUpdated = !eventBus.userUpdated;

        this.$router.push('/');
      } catch (error) {
        console.error("Erreur API :", error);
        alert("Erreur inattendue lors de la mise à jour du profil.");
      }
    },

    async deleteAccount() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;

      const confirmDelete = confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.");
      if (!confirmDelete) return;

      try {
        const response = await fetch(`http://localhost:3000/api/admin/users/${user.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erreur serveur :", errorText);
          alert("Erreur lors de la suppression du compte.");
          return;
        }

        localStorage.removeItem('user');
        alert("Votre compte a été supprimé.");

        this.$router.push('/auth'); // ← adapte la route si besoin
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
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.profile-form {
  background: white;
  color: black;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.profile-form label {
  font-weight: bold;
  margin-top: 1rem;
  display: block;
}

.profile-form input[type="text"],
.profile-form input[type="file"] {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 1rem;
}

.avatar-preview img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
}

.avatar-upload input[type="file"] {
  display: none;
}

.custom-file-upload {
  display: inline-block;
  padding: 0.6rem 1rem;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 1rem;
}

.custom-file-upload:hover {
  background-color: #2980b9;
}

.profile-form button {
  margin-bottom: 10px;
  background-color: #2980b9;
  color: white;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.profile-form button:hover {
  background-color: #216f9d;
}

.delete-button {
  background-color: #e74c3c;
}

.delete-button:hover {
  background-color: #c0392b;
}

</style>
