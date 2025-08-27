// battleship-api/index.js

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js'; 
import userProfileRoutes from './routes/user.js';  // GET + PUT user profile
import adminUsersRoutes from './api/admin/users.js';
import checkPseudoRoute from './api/check-pseudo.js';
import gameRoutes from './routes/games.js';


/* Initialisation de l'app */
const app = express();
const friendsRoutes = require("./routes/friends");



// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Routes API
app.use('/api', authRoutes);                // auth routes
app.use('/api/users', userProfileRoutes);  // routes /api/users/:id (GET, PUT)
app.use('/api/admin', adminUsersRoutes);
app.use('/api', checkPseudoRoute);
app.use('/api', gameRoutes);


// Route de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API BattleShip ! 🚢');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ API démarrée sur http://localhost:${PORT}`);
});
