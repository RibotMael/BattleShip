import axios from "axios";
import router from "@/router";

const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8080/api"        
  : "https://battleship-api-i276.onrender.com/api"; 

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// ─── NOUVEAU : Intercepteur de REQUÊTE ───────────────────────
// Ajoute le token à chaque appel API sortant
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Assure-toi que c'est le bon nom de clé
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Intercepteur de RÉPONSE (existant) ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Nettoyage complet
      localStorage.removeItem("token"); // Ne pas oublier de supprimer le token aussi
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      router.push("/");
    }
    return Promise.reject(error);
  }
);

export default api;