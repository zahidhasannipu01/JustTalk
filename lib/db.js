import mysql from 'mysql2/promise';

let pool;
export function db() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'talk_app',
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });
  }
  return pool;
}
export async function q(sql, params = []) {
  const [rows] = await db().execute(sql, params);
  return rows;
}
export async function q1(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] || null;
}
