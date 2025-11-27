import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// Routes
import authRoutes from "./routes/auth.js"; 
import userProfileRoutes from "./routes/user.js";  
import checkPseudoRoute from "./api/check-pseudo.js";
import avatarRouter from "./api/avatar.js";
import friendsRouter from './routes/friends.js';
import invitationsRouter from './routes/invitations.js';
import gamesRouter from './routes/games.js';

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Routes API
app.use("/api", authRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api", checkPseudoRoute);
app.use("/api/friends", friendsRouter);
app.use("/api/invitation", invitationsRouter);
app.use("/api", avatarRouter);

// Routes de jeux
app.use("/api/games", gamesRouter);

// Route de base
app.get('/', (req, res) => {
  res.send("Bienvenue sur l'API BattleShip ! 🚢");
});

// Gestion 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

// Lancement du serveur
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Backend Battleship en ligne sur http://localhost:8080`);
});
