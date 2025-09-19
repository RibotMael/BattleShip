// battleship-api/index.js
import express from "express";
import cors from "cors";

// Routes
import authRoutes from "./routes/auth.js"; 
import userProfileRoutes from "./routes/user.js";  
import checkPseudoRoute from "./api/check-pseudo.js";
import gamesRouter from "./routes/games.js"; 
import friendsRouter from './routes/friends.js';
import getGameRouter from "./api/games/get-game.js";
import invitationsRouter from './routes/invitations.js';

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Routes API
app.use("/api", authRoutes);                     // Auth
app.use("/api/users", userProfileRoutes);       // Profils
app.use("/api", checkPseudoRoute);              // Check pseudo
app.use("/api/friends", friendsRouter);         // Friends
app.use("/api/games", gamesRouter);             // Création, join, invite, leave
app.use("/api/games/get", getGameRouter);       // Routes pour récupérer les parties
app.use("/api/invitations", invitationsRouter); // Invitations

// Route de base
app.get('/', (req, res) => {
  res.send("Bienvenue sur l'API BattleShip ! 🚢");
});

// Gestion 404 pour toutes les routes non définies
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

// Démarrage serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API démarrée sur http://localhost:${PORT}`);
});
