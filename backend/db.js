import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Ensure environment variables are loaded when this module is imported
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || undefined,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  timezone: '+08:00' // 设置时区为UTC+8（北京/香港/台北时间）
});

/**
 * 执行SQL查询
 * 每次查询前设置会话时区为 UTC+8
 * Note: Using pool.query instead of pool.execute for better compatibility
 */
export async function query(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    // 设置会话时区为 UTC+8
    await connection.query("SET time_zone = '+08:00'");
    // Use query instead of execute for better compatibility with various param types
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}

export async function healthCheck() {
  const [rows] = await pool.query('SELECT 1 AS alive, DATABASE() AS db');
  return rows?.[0];
}

export default pool;


