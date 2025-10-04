// battleship-api/db.js

import mysql from 'mysql2/promise'; 

const pool = mysql.createPool({
  host: '5.178.107.184', 
  user: 'group2',
  password: 'grp2pass',
  database: 'bataillenavale',
  port: 3306,
});

pool.getConnection()
  .then(conn => {
    console.log("✅ Connexion MySQL OK");
    conn.release();
  })
  .catch(err => console.error("❌ Erreur MySQL :", err));


// Fonction de requête réutilisable
async function query(sql, params) {
  return pool.execute(sql, params);
}

export { query };
export default pool;

