// battleship-api / db.js

import mysql from 'mysql2/promise'; 

const pool = mysql.createPool({
  host: '127.0.0.1', // ← Remplace localhost par 127.0.0.1
  user: 'root',
  password: '',
  database: 'battleship',
  port: 3306,
  connectTimeout: 30000, 
});

// Fonction de requête réutilisable
async function query(sql, params) {
  return pool.execute(sql, params);
}

export { query };
export default pool;
