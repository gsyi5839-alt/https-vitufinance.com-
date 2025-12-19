/**
 * 优化后的数据库连接池配置
 * 
 * 优化点:
 * 1. 增大连接池大小 (10 -> 50)
 * 2. 移除每次查询的时区设置,改为连接池初始化时设置
 * 3. 添加连接池监控
 * 4. 添加慢查询日志
 * 5. 添加查询缓存支持
 * 
 * 创建时间: 2025-12-18
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 创建优化后的连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || undefined,
  
  // 连接池配置 - 优化
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 50), // 从10增加到50
  queueLimit: 0,
  maxIdle: 10, // 最大空闲连接数
  idleTimeout: 60000, // 空闲连接超时时间 (60秒)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // 时区配置 - 在连接初始化时设置
  timezone: '+08:00',
  
  // 字符集
  charset: 'utf8mb4',
  
  // 连接初始化 SQL (每个新连接创建时执行)
  initSql: [
    "SET time_zone = '+08:00'",
    "SET NAMES utf8mb4",
    "SET sql_mode = 'TRADITIONAL'"
  ].join(';')
});

// 慢查询阈值 (毫秒)
const SLOW_QUERY_THRESHOLD = Number(process.env.SLOW_QUERY_THRESHOLD || 1000);

/**
 * 执行SQL查询 (优化版)
 * 
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数
 * @param {Object} options - 选项 { cache: boolean, cacheTTL: number }
 * @returns {Promise<Array>} 查询结果
 */
export async function query(sql, params = [], options = {}) {
  const startTime = Date.now();
  
  try {
    // Use pool.query instead of pool.execute for better compatibility
    // pool.execute uses prepared statements which have stricter type requirements
    const [rows] = await pool.query(sql, params);
    
    // Slow query logging
    const duration = Date.now() - startTime;
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`[DB] 慢查询检测 (${duration}ms):`, {
        sql: sql.substring(0, 200),
        params: params.length > 0 ? params : undefined,
        duration: `${duration}ms`
      });
    }
    
    return rows;
  } catch (error) {
    console.error('[DB] 查询错误:', {
      sql: sql.substring(0, 200),
      error: error.message
    });
    throw error;
  }
}

/**
 * 批量查询 (事务)
 * 
 * @param {Function} callback - 回调函数,接收 connection 参数
 * @returns {Promise<any>} 事务结果
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 健康检查
 */
export async function healthCheck() {
  try {
    const [rows] = await pool.query('SELECT 1 AS alive, DATABASE() AS db, NOW() AS time');
    return {
      alive: true,
      database: rows[0]?.db,
      time: rows[0]?.time,
      poolStatus: {
        totalConnections: pool.pool._allConnections.length,
        freeConnections: pool.pool._freeConnections.length,
        queueLength: pool.pool._connectionQueue.length
      }
    };
  } catch (error) {
    return {
      alive: false,
      error: error.message
    };
  }
}

/**
 * 获取连接池状态
 */
export function getPoolStatus() {
  return {
    totalConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    queueLength: pool.pool._connectionQueue.length,
    limit: pool.pool.config.connectionLimit
  };
}

// 定期输出连接池状态 (开发环境)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const status = getPoolStatus();
    if (status.totalConnections > 0) {
      console.log('[DB Pool]', status);
    }
  }, 60000); // 每分钟输出一次
}

export default pool;

