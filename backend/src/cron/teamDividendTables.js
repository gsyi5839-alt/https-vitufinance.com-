import { getDbQuery } from './teamDividendState.js';

async function initTeamRewardsTable() {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        console.error('[TeamCron] 数据库查询函数未设置，无法初始化表');
        return;
    }

    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS team_rewards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(42) NOT NULL,
                reward_type VARCHAR(50) NOT NULL DEFAULT 'daily_dividend',
                broker_level INT NOT NULL DEFAULT 0,
                reward_amount DECIMAL(20, 4) NOT NULL DEFAULT 0,
                reward_date DATE NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_wallet (wallet_address),
                INDEX idx_date (reward_date),
                INDEX idx_type (reward_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('[TeamCron] ✅ team_rewards 表初始化完成');
    } catch (error) {
        if (!error.message.includes('already exists')) {
            console.error('[TeamCron] 初始化 team_rewards 表失败:', error.message);
        }
    }
}

async function initCronLogsTable() {
    const dbQuery = getDbQuery();
    if (!dbQuery) {
        console.error('[TeamCron] 数据库查询函数未设置，无法初始化 cron_logs 表');
        return;
    }

    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS cron_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cron_name VARCHAR(100) NOT NULL,
                status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
                message TEXT,
                stats JSON,
                started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                finished_at DATETIME,
                duration_seconds DECIMAL(10, 3),
                INDEX idx_cron_name (cron_name),
                INDEX idx_status (status),
                INDEX idx_started_at (started_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('[TeamCron] ✅ cron_logs 表初始化完成');
    } catch (error) {
        if (!error.message.includes('already exists')) {
            console.error('[TeamCron] 初始化 cron_logs 表失败:', error.message);
        }
    }
}

export {
    initTeamRewardsTable,
    initCronLogsTable
};
