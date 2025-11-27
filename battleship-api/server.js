// battleship-api/server.js
import express from "express";
import http from "http";
import db from "./db.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

// endpoint shoot classique pour sauvegarde
app.post("/api/games/shoot", async (req, res) => {
  const { gameId, playerId, cell } = req.body;
  try {
    const [rows] = await db.query("SELECT grid_player1, grid_player2 FROM games WHERE ID_Game = ?", [gameId]);
    const game = rows[0];

    // déterminer quelle grille touche ce joueur
    const playerGrid = playerId === game.player1_id ? game.grid_player2 : game.grid_player1;
    const grid = JSON.parse(playerGrid);

    const hit = grid[cell - 1] === 1;
    grid[cell - 1] = hit ? "hit" : "miss";

    if (playerId === game.player1_id) {
      await db.query("UPDATE games SET grid_player2 = ? WHERE ID_Game = ?", [JSON.stringify(grid), gameId]);
    } else {
      await db.query("UPDATE games SET grid_player1 = ? WHERE ID_Game = ?", [JSON.stringify(grid), gameId]);
    }

    // vérifier fin de partie
    const gameOver = !grid.includes(1);

    res.json({ success: true, hit, gameOver });

    // envoyer événement temps réel à tous les joueurs
    io.to(gameId.toString()).emit("shootUpdate", { playerId, cell, hit, gameOver });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

server.listen(8080, () => console.log("Serveur lancé sur http://localhost:8080"));
