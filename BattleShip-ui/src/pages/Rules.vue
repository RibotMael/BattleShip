<!-- src/pages/Rules.vue -->
<template>
  <div class="rules-container">
    <h1>⚓ Règles du jeu – BattleShip</h1>
    
    <h2>🌐 Modes de langue & variantes</h2>
    <p>Lors de la connexion au jeu, chaque joueur choisit un <strong>mode de jeu régional</strong>, qui influence les <strong>règles navales</strong> et le <strong>type de flotte</strong> :</p>
    
    <h3>🇫🇷 Mode Français</h3>
    <ul>
      <li><strong>Grille</strong> : 10 x 10 (colonnes A–J, lignes 1–10)</li>
      <li><strong>Disposition des navires</strong> :</li>
      <ul>
        <li>1 Porte-avions (5 cases)</li>
        <li>1 Croiseur (4 cases)</li>
        <li>2 Contre-torpilleurs (3 cases)</li>
        <li>1 Torpilleur (2 cases)</li>
      </ul>
    </ul>
    
    <h3>🇧🇪 Mode Belge</h3>
    <ul>
      <li><strong>Grille</strong> : 10 x 10 (colonnes A–J, lignes 1–10)</li>
      <li><strong>Disposition des navires</strong> :</li>
      <ul>
        <li>1 Cuirassé (4 cases)</li>
        <li>2 Croiseurs (3 cases)</li>
        <li>3 Torpilleurs (2 cases)</li>
        <li>4 Sous-marins (1 case)</li>
      </ul>
    </ul>

    <h2>⚔️ Objectif du jeu</h2>
    <p>Le but est d’être le dernier joueur (ou équipe) avec des bateaux à flot en détruisant la flotte de l’adversaire.</p>

    <h2>🎮 Modes de jeu</h2>
    <ul>
      <li><strong>1 vs 1</strong> : Duel classique entre deux joueurs.</li>
      <li><strong>2 vs 2</strong> : Coopération entre deux joueurs par équipe. Chaque joueur garde sa propre grille.</li>
      <li><strong>4 vs 4</strong> : Bataille entre équipes de 4 joueurs (chaque joueur a sa grille).</li>
      <li><strong>Battle Royale</strong> : Chaque joueur lutte seul contre tous. Le dernier joueur avec un bateau intact gagne.</li>
    </ul>

    <h2>🧩 Déroulement d’une partie</h2>
    <ul>
      <li><strong>Placement des navires</strong> : Chaque joueur place ses navires sur sa grille secrète. Les navires ne doivent pas être adjacents les uns aux autres (ni horizontalement, verticalement, ni en diagonale).</li>
      <li><strong>Tour par tour</strong> : À chaque tour, un joueur annonce une case (ex : `B6`). Le jeu détecte automatiquement si le tir touche ou non un navire.
        <ul>
          <li><strong>Tir raté</strong> : Le joueur reçoit un message disant "À l'eau".</li>
          <li><strong>Tir touché</strong> : Le joueur reçoit un message disant "Touché".</li>
          <li><strong>Tir touché-coulé</strong> : Si toutes les cases du navire sont atteintes, le jeu annonce "Touché-coulé".</li>
        </ul>
      </li>
      <li><strong>Fin de la partie</strong> : La partie se termine dès qu'un joueur ou une équipe a coulé tous les navires de l’adversaire.</li>
    </ul>

    <h2>📊 Suivi des victoires & défaites</h2>
    <p>Chaque joueur dispose d’un <strong>compte de victoires/défaites</strong>, visible sur son profil :</p>
    <ul>
      <li><strong>Victoire</strong> : Gagner une partie augmente le compteur de victoires.</li>
      <li><strong>Défaite</strong> : Perdre une partie augmente le compteur de défaites.</li>
    </ul>

    <h2>🔍 Rejoindre une partie</h2>
    <ul>
      <li><strong>Accès rapide</strong> : Choisir un mode de jeu (1vs1, 2vs2, etc.), choisir un mode linguistique (Français ou Belge), et rejoindre une partie publique.</li>
      <li><strong>Recherche par critères</strong> : Choisir le mode de jeu, le mode linguistique, et filtrer par statut de la partie (en attente, en cours, terminée).</li>
    </ul>

    <h2>⚙️ Créer une partie</h2>
    <p>Le créateur de la partie peut :</p>
    <ul>
      <li>Choisir un mode de jeu (1vs1, 2vs2, etc.) et un mode linguistique (Français ou Belge).</li>
      <li>Créer une partie <strong>publique ou privée</strong> (avec mot de passe pour les parties privées).</li>
      <li>Paramétrer la flotte classique : les règles de placement des navires et le type de flotte (selon le mode linguistique choisi).</li>
      <li>Définir un <strong>temps de réflexion par tour</strong> pour chaque joueur.</li>
    </ul>

    <button @click="$router.push('/')" class="back-button">Retour au menu</button>
  </div>
</template>
  
  <style scoped>
  .rules-container {
    background: linear-gradient(to bottom, #002f4b, #005f8e);
    color: white;
    padding: 3rem;
    text-align: center;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  
  .rules-container h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-shadow: 1px 1px 3px #000;
  }
  
  .rules-container ul {
    list-style: none;
    padding: 0;
    text-align: left;
    max-width: 600px;
  }
  
  .rules-container li {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    position: relative;
    padding-left: 1.5rem;
  }
  
  .back-button {
    margin-top: 2rem;
    padding: 0.8rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    color: white;
    background-color: #1f78b4;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.3s;
  }
  
  .back-button:hover {
    background-color: #145d89;
  }
  </style>
  