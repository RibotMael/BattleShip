<template>
  <div>
    <button class="friends-button" @click="showFriends = true">👥 Amis</button>

    <div v-if="showFriends" class="popup-overlay">
      <div class="popup-content">
        <h2>Mes amis</h2>

        <ul>
          <li v-for="f in friends" :key="f.ID_Users">{{ f.Pseudo }} ({{ f.Email }})</li>
        </ul>

        <h3>Ajouter un ami</h3>
        <input v-model="identifier" placeholder="Pseudo ou Email" />
        <button @click="addFriend">Ajouter</button>

        <h3>Demandes reçues</h3>
        <ul>
          <li v-for="req in requests" :key="req.ID_Friends">
            {{ req.Pseudo }}
            <button @click="acceptRequest(req.ID_Users)">Accepter</button>
          </li>
        </ul>

        <button @click="showFriends = false">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showFriends: false,
      friends: [],
      requests: [],
      identifier: "",
    };
  },
  methods: {
    async fetchFriends() {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await fetch(`http://localhost:3000/api/friends/list/${user.ID_Users}`);
      this.friends = await res.json();

      const req = await fetch(`http://localhost:3000/api/friends/requests/${user.ID_Users}`);
      this.requests = await req.json();
    },
    async addFriend() {
      const user = JSON.parse(localStorage.getItem("user"));
      await fetch("http://localhost:3000/api/friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.ID_Users, identifier: this.identifier }),
      });
      this.identifier = "";
      this.fetchFriends();
    },
    async acceptRequest(friendId) {
      const user = JSON.parse(localStorage.getItem("user"));
      await fetch("http://localhost:3000/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.ID_Users, friendId }),
      });
      this.fetchFriends();
    },
  },
  watch: {
    showFriends(val) {
      if (val) this.fetchFriends();
    },
  },
};
</script>
