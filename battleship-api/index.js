// bataillenavale-api/index.js
import express from "express";
import cors from "cors";

// Routes
import authRoutes from "./routes/auth.js"; 
import userProfileRoutes from "./routes/user.js";  
import checkPseudoRoute from "./api/check-pseudo.js";
import avatarRouter from "./api/avatar.js";
import friendsRouter from './routes/friends.js';
import invitationsRouter from './routes/invitations.js';

// Routes de jeux
import gamesRouter from './routes/games.js'; // regrouper create, get, start, leave

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Routes API
app.use("/api", authRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api", checkPseudoRoute);
app.use("/api/friends", friendsRouter);
app.use("/api/games/invite", invitationsRouter);
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

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ API démarrée sur http://localhost:${PORT}`));

