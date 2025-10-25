<template>
  <div class="rules-container">
    <h1>⚓ Règles du jeu – BattleShip</h1>

    <div class="rules-section">
      <h2>🌐 Modes de langue & variantes</h2>
      <p>
        Lors de la connexion au jeu, chaque joueur choisit un <strong>mode de jeu régional</strong>,
        qui influence les <strong>règles navales</strong> et le <strong>type de flotte</strong> :
      </p>

      <div class="card">
        <h3>🇫🇷 Mode Français</h3>
        <ul>
          <li><strong>Grille</strong> : 10 x 10 (colonnes A–J, lignes 1–10)</li>
          <li>
            <strong>Disposition des navires</strong> :
            <ul>
              <li>1 Porte-avions (5 cases)</li>
              <li>1 Croiseur (4 cases)</li>
              <li>2 Contre-torpilleurs (3 cases)</li>
              <li>1 Torpilleur (2 cases)</li>
            </ul>
          </li>
        </ul>
      </div>

      <div class="card">
        <h3>🇧🇪 Mode Belge</h3>
        <ul>
          <li><strong>Grille</strong> : 10 x 10 (colonnes A–J, lignes 1–10)</li>
          <li>
            <strong>Disposition des navires</strong> :
            <ul>
              <li>1 Cuirassé (4 cases)</li>
              <li>2 Croiseurs (3 cases)</li>
              <li>3 Torpilleurs (2 cases)</li>
              <li>4 Sous-marins (1 case)</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <div class="rules-section card">
      <h2>⚔️ Objectif du jeu</h2>
      <p>
        Le but est d’être le dernier joueur (ou équipe) avec des bateaux à flot en détruisant la
        flotte de l’adversaire.
      </p>
    </div>

    <div class="rules-section card">
      <h2>🎮 Modes de jeu</h2>
      <ul>
        <li><strong>1 vs 1</strong> : Duel classique entre deux joueurs.</li>
        <li><strong>2 vs 2</strong> : Coopération entre deux joueurs par équipe.</li>
        <li><strong>4 vs 4</strong> : Bataille entre équipes de 4 joueurs.</li>
        <li><strong>Battle Royale</strong> : Chaque joueur lutte seul contre tous.</li>
      </ul>
    </div>

    <div class="rules-section card">
      <h2>🧩 Déroulement d’une partie</h2>
      <ul>
        <li>
          <strong>Placement des navires</strong> : Chaque joueur place ses navires sur sa grille
          secrète. Pas d’adjacence entre navires.
        </li>
        <li>
          <strong
            >Chaque joueur à 8 secondes pour tirer sur une case, sinon le tir est aléatoire</strong
          >
          : Le jeu détecte automatiquement si le tir touche.
          <ul>
            <li><strong>Tir raté</strong> : "À l'eau".</li>
            <li><strong>Tir touché</strong> : "Touché".</li>
            <li><strong>Tir touché-coulé</strong> : "Touché-coulé".</li>
          </ul>
        </li>
        <li>
          <strong>Fin de partie</strong> : Dès qu’un joueur ou une équipe n’a plus de bateaux.
        </li>
      </ul>
    </div>

    <div class="rules-section card">
      <h2>📊 Suivi des victoires & défaites</h2>
      <p>Chaque joueur dispose d’un <strong>compte de victoires/défaites</strong> :</p>
      <ul>
        <li><strong>Victoire</strong> : Augmente le compteur de victoires.</li>
        <li><strong>Défaite</strong> : Augmente le compteur de défaites.</li>
      </ul>
    </div>

    <div class="rules-section card">
      <h2>🔍 Rejoindre ou créer une partie</h2>
      <ul>
        <li><strong>Accès rapide</strong> : Choisir un mode de jeu et un mode linguistique.</li>
        <li>
          <strong>Création</strong> : Définir le mode, la langue, publique ou privée, flotte et
          temps par tour.
        </li>
      </ul>
    </div>

    <button @click="$router.push('/')" class="back-button">Retour au menu</button>
  </div>
</template>

<style scoped>
.rules-container {
  background: linear-gradient(to bottom, #002f4b, #005f8e);
  color: white;
  padding: 2rem;
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
}

.rules-container h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-shadow: 2px 2px 5px #000;
}

.rules-section {
  margin-bottom: 2rem;
  width: 100%;
  max-width: 700px;
}

.card {
  background: rgba(0, 0, 0, 0.4);
  padding: 1.5rem;
  border-radius: 15px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}

.rules-section h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.rules-section h3 {
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
  color: #ffd700;
}

.rules-container ul {
  list-style: none;
  padding: 0;
  text-align: left;
}

.rules-container li {
  font-size: 1.1rem;
  margin-bottom: 0.8rem;
  padding-left: 1.5rem;
  position: relative;
}

.rules-container li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #1f78b4;
  font-weight: bold;
}

.back-button {
  width: auto;
  margin-top: 2rem;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  background-color: #1f78b4;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
}

.back-button:hover {
  background-color: #145d89;
  transform: scale(1.05);
}
</style>
