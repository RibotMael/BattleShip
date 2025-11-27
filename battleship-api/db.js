import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,       
  user: process.env.DB_USER,    
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

console.log("→ Base utilisée :", process.env.DB_NAME);

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
