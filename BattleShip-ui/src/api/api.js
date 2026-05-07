import axios from "axios";
import router from "@/router";

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:8080/api";

if (!import.meta.env.VITE_API_URL) {
  console.warn("⚠️ VITE_API_URL non défini, fallback localhost");
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token"); 
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      if (router.currentRoute.value.path !== "/") {
        router.push("/");
      }
    }
    return Promise.reject(error);
  }
);

export default api;