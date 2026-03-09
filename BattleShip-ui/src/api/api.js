import axios from "axios";
import router from "@/router";

const api = axios.create({
  baseURL: "https://battleship-api-i276.onrender.com/api",
});

// Intercepteur global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Utilisateur non autorisé — redirection.");
      localStorage.removeItem("user");
      router.push("/login");
    }
    return Promise.reject(error);
  }
);

export default api;

