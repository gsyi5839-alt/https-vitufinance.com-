let dbQuery = null;

export const PRIZES = [
    { id: 1, name: '特等奖', rewardType: 'BTC', rewardAmount: 1, probability: 0.0000001 },
    { id: 2, name: '一等奖', rewardType: 'USDT', rewardAmount: 200, probability: 0.000001 },
    { id: 3, name: '二等奖', rewardType: 'USDT', rewardAmount: 100, probability: 0.00001 },
    { id: 4, name: '三等奖', rewardType: 'WLD', rewardAmount: 50, probability: 0.001 },
    { id: 5, name: '四等奖', rewardType: 'WLD', rewardAmount: 30, probability: 0.01 },
    { id: 6, name: '五等奖', rewardType: 'WLD', rewardAmount: 5, probability: 0.9889879 }
];

export const WHEEL_TYPES = {
    silver: { name: '白银转盘', requiredPoints: 3000, multiplier: 1 },
    gold: { name: '黄金转盘', requiredPoints: 10000, multiplier: 2 },
    diamond: { name: '钻石转盘', requiredPoints: 30000, multiplier: 5 }
};

export function setDbQuery(queryFn) {
    dbQuery = queryFn;
    console.log('[LuckyWheel] 数据库查询函数已设置');
}

export function getLuckyWheelDbQuery() {
    if (!dbQuery) {
        throw new Error('[LuckyWheel] dbQuery 未设置');
    }
    return dbQuery;
}

export async function initLuckyWheelTables() {
    if (!dbQuery) {
        console.error('[LuckyWheel] dbQuery 未设置，无法初始化表');
        return;
    }

    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS user_lucky_points (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(100) NOT NULL,
                lucky_points DECIMAL(20, 2) DEFAULT 0,
                total_earned DECIMAL(20, 2) DEFAULT 0,
                total_spent DECIMAL(20, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_wallet (wallet_address),
                INDEX idx_wallet (wallet_address)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('[LuckyWheel] user_lucky_points 表已就绪');

        await dbQuery(`
            CREATE TABLE IF NOT EXISTS lucky_wheel_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(100) NOT NULL,
                wheel_type ENUM('silver', 'gold', 'diamond') NOT NULL,
                prize_id INT NOT NULL,
                prize_name VARCHAR(100) NOT NULL,
                reward_type ENUM('BTC', 'USDT', 'WLD') NOT NULL,
                reward_amount DECIMAL(20, 8) NOT NULL,
                points_spent DECIMAL(20, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_wallet (wallet_address),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('[LuckyWheel] lucky_wheel_records 表已就绪');

        await dbQuery(`
            CREATE TABLE IF NOT EXISTS lucky_wheel_announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(100) NOT NULL,
                prize_name VARCHAR(100) NOT NULL,
                reward_display VARCHAR(100) NOT NULL,
                is_virtual TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('[LuckyWheel] lucky_wheel_announcements 表已就绪');

        await dbQuery(`
            CREATE TABLE IF NOT EXISTS lucky_wheel_rigged (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(100) NOT NULL,
                prize_id INT NOT NULL,
                prize_name VARCHAR(100) NOT NULL,
                created_by VARCHAR(100) DEFAULT 'admin',
                used TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP NULL,
                UNIQUE KEY unique_wallet_pending (wallet_address, used),
                INDEX idx_wallet (wallet_address),
                INDEX idx_used (used)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('[LuckyWheel] lucky_wheel_rigged 指定中奖表已就绪');

        const announcementCount = await dbQuery(
            'SELECT COUNT(*) as count FROM lucky_wheel_announcements'
        );

        if (announcementCount[0].count === 0) {
            await generateVirtualAnnouncements();
        }

        console.log('[LuckyWheel] 所有表初始化完成');
    } catch (error) {
        console.error('[LuckyWheel] 初始化表失败:', error);
    }
}

async function generateVirtualAnnouncements() {
    const prizes = [
        { name: '五等奖', display: '+5 WLD' },
        { name: '四等奖', display: '+30 WLD' },
        { name: '五等奖', display: '+5 WLD' },
        { name: '三等奖', display: '+50 WLD' },
        { name: '五等奖', display: '+5 WLD' },
        { name: '四等奖', display: '+30 WLD' },
        { name: '五等奖', display: '+5 WLD' },
        { name: '二等奖', display: '+100 USDT' },
        { name: '五等奖', display: '+5 WLD' },
        { name: '四等奖', display: '+30 WLD' }
    ];

    const insertValues = [];
    for (let i = 0; i < 30; i++) {
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        const walletPart = Math.random().toString(36).substring(2, 8);
        const walletAddress = `0x${walletPart}...${walletPart.slice(-4)}`;
        insertValues.push(`('${walletAddress}', '${prize.name}', '${prize.display}', 1)`);
    }

    await dbQuery(`
        INSERT INTO lucky_wheel_announcements
        (wallet_address, prize_name, reward_display, is_virtual)
        VALUES ${insertValues.join(', ')}
    `);

    console.log('[LuckyWheel] 已生成虚拟获奖公告');
}

export function getRandomPrize() {
    const rand = Math.random();
    let cumulative = 0;

    for (const prize of PRIZES) {
        cumulative += prize.probability;
        if (rand < cumulative) {
            return prize;
        }
    }

    return PRIZES[PRIZES.length - 1];
}

export async function checkRiggedPrize(walletAddress) {
    if (!dbQuery || !walletAddress) return null;

    try {
        const [rigged] = await dbQuery(
            `SELECT id, prize_id, prize_name FROM lucky_wheel_rigged
             WHERE wallet_address = ? AND used = 0
             ORDER BY created_at ASC LIMIT 1`,
            [walletAddress.toLowerCase()]
        );

        if (!rigged) {
            return null;
        }

        // SECURITY: atomically claim the rigged entry — only the first concurrent spin
        // that flips used 0→1 may use it; others fall back to a normal random draw.
        const claim = await dbQuery(
            'UPDATE lucky_wheel_rigged SET used = 1, used_at = NOW() WHERE id = ? AND used = 0',
            [rigged.id]
        );

        if (!claim || claim.affectedRows === 0) {
            return null;
        }

        const prize = PRIZES.find(item => item.id === rigged.prize_id);
        if (prize) {
            console.log(`[LuckyWheel] 🎯 指定中奖生效: ${walletAddress.slice(0, 10)}... -> ${rigged.prize_name}`);
            return prize;
        }

        return null;
    } catch (error) {
        console.error('[LuckyWheel] 检查指定中奖失败:', error);
        return null;
    }
}

export async function addLuckyPoints(walletAddress, points, source = 'system') {
    if (!dbQuery || !walletAddress || points <= 0) return;

    try {
        const normalizedAddress = walletAddress.toLowerCase();
        const existing = await dbQuery(
            'SELECT id FROM user_lucky_points WHERE wallet_address = ?',
            [normalizedAddress]
        );

        if (existing.length > 0) {
            await dbQuery(
                `UPDATE user_lucky_points
                 SET lucky_points = lucky_points + ?,
                     total_earned = total_earned + ?
                 WHERE wallet_address = ?`,
                [points, points, normalizedAddress]
            );
        } else {
            await dbQuery(
                `INSERT INTO user_lucky_points (wallet_address, lucky_points, total_earned)
                 VALUES (?, ?, ?)`,
                [normalizedAddress, points, points]
            );
        }

        console.log(`[LuckyWheel] 用户 ${normalizedAddress.slice(0, 10)}... 获得 ${points} 幸运值 (${source})`);
    } catch (error) {
        console.error('[LuckyWheel] 添加幸运值失败:', error);
    }
}
