/**
 * 检查过期机器人数据
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function check() {
    const conn = await pool.getConnection();
    try {
        // 所有机器人统计
        console.log('\n=== 所有机器人状态统计 ===');
        const [stats] = await conn.query(`
            SELECT robot_type, status, COUNT(*) as count 
            FROM robot_purchases 
            GROUP BY robot_type, status
        `);
        console.table(stats);
        
        // 检查 Follow 页面机器人（grid, high）
        console.log('\n=== Follow 页面机器人（grid/high 类型） ===');
        const [follow] = await conn.query(`
            SELECT id, robot_name, robot_type, status, price, is_quantified,
                   DATE_FORMAT(end_time, '%Y-%m-%d %H:%i') as end_time,
                   CASE WHEN end_time <= NOW() THEN '已到期' ELSE '运行中' END as expire_status,
                   CONCAT(LEFT(wallet_address, 10), '...') as wallet
            FROM robot_purchases 
            WHERE robot_type IN ('grid', 'high')
            ORDER BY created_at DESC
            LIMIT 20
        `);
        console.table(follow);
        
        // 已到期的 Follow 机器人
        console.log('\n=== 已到期的 Follow 机器人（应显示在 Expired Robot 标签） ===');
        const [expired] = await conn.query(`
            SELECT id, robot_name, robot_type, status, price, is_quantified,
                   DATE_FORMAT(end_time, '%Y-%m-%d %H:%i') as end_time,
                   CONCAT(LEFT(wallet_address, 10), '...') as wallet
            FROM robot_purchases 
            WHERE robot_type IN ('grid', 'high')
            AND (status = 'expired' OR end_time <= NOW())
            ORDER BY end_time DESC
        `);
        console.table(expired);
        console.log('过期机器人数量:', expired.length);
        
        // 检查是否有用户的钱包地址
        if (expired.length > 0) {
            const walletAddr = expired[0].wallet.replace('...', '');
            console.log(`\n=== 获取用户 ${walletAddr}... 的完整钱包地址 ===`);
            const [user] = await conn.query(`
                SELECT wallet_address FROM robot_purchases WHERE LEFT(wallet_address, 10) = ? LIMIT 1
            `, [walletAddr]);
            if (user.length > 0) {
                console.log('完整地址:', user[0].wallet_address);
                console.log('\n测试命令:');
                console.log(`curl "http://localhost:3001/api/follow/expired?wallet_address=${user[0].wallet_address}"`);
            }
        }
        
    } finally {
        conn.release();
        await pool.end();
    }
}

check().catch(err => console.error('Error:', err.message));

