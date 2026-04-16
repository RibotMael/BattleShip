import axios from "axios";
import router from "@/router";

// Détection dynamique de l'URL de base
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080/api"           // URL pour le développement local
  : "https://battleship-api-i276.onrender.com/api"; // URL pour la production Render

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Intercepteur global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("user");
      router.push("/login");
    }
    return Promise.reject(error);
  }
);

export default api;