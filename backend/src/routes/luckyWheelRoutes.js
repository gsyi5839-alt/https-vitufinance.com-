/**
 * 抽奖转盘路由模块
 * 功能：幸运转盘抽奖、幸运值管理、中奖记录
 */

import express from 'express';

const router = express.Router();

// 数据库查询函数（由 server.js 注入）
let dbQuery = null;

/**
 * 设置数据库查询函数
 * @param {Function} queryFn - 数据库查询函数
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
    console.log('[LuckyWheel] 数据库查询函数已设置');
}

/**
 * 初始化抽奖相关数据库表
 */
export async function initLuckyWheelTables() {
    if (!dbQuery) {
        console.error('[LuckyWheel] dbQuery 未设置，无法初始化表');
        return;
    }

    try {
        // 用户幸运值表
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

        // 抽奖记录表
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

        // 获奖公告表（用于前端滚动显示）
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

        // 指定中奖表（管理员可以指定用户下次中什么奖）
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

        // 初始化一些虚拟中奖公告（用于前端展示）
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

/**
 * 生成虚拟获奖公告
 */
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
        { name: '四等奖', display: '+30 WLD' },
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

/**
 * 奖品配置
 * 概率总和应为 100% - 已调低高价值奖品概率
 */
const PRIZES = [
    { id: 1, name: '特等奖', rewardType: 'BTC', rewardAmount: 1, probability: 0.0000001 },   // 0.00001% (几乎不可能)
    { id: 2, name: '一等奖', rewardType: 'USDT', rewardAmount: 200, probability: 0.000001 }, // 0.0001%
    { id: 3, name: '二等奖', rewardType: 'USDT', rewardAmount: 100, probability: 0.00001 },  // 0.001%
    { id: 4, name: '三等奖', rewardType: 'WLD', rewardAmount: 50, probability: 0.001 },      // 0.1%
    { id: 5, name: '四等奖', rewardType: 'WLD', rewardAmount: 30, probability: 0.01 },       // 1%
    { id: 6, name: '五等奖', rewardType: 'WLD', rewardAmount: 5, probability: 0.9889879 },   // 98.89879%
];

/**
 * 转盘类型配置
 */
const WHEEL_TYPES = {
    silver: { name: '白银转盘', requiredPoints: 3000, multiplier: 1 },
    gold: { name: '黄金转盘', requiredPoints: 10000, multiplier: 2 },
    diamond: { name: '钻石转盘', requiredPoints: 30000, multiplier: 5 }
};

/**
 * 根据概率随机选择奖品
 * @returns {Object} 选中的奖品
 */
function getRandomPrize() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const prize of PRIZES) {
        cumulative += prize.probability;
        if (rand < cumulative) {
            return prize;
        }
    }
    
    // 默认返回最后一个奖品（五等奖）
    return PRIZES[PRIZES.length - 1];
}

/**
 * 检查是否有指定中奖（管理员设置）
 * @param {string} walletAddress - 钱包地址
 * @returns {Object|null} 指定的奖品或 null
 */
async function checkRiggedPrize(walletAddress) {
    if (!dbQuery || !walletAddress) return null;
    
    try {
        // 查找未使用的指定中奖记录
        const [rigged] = await dbQuery(
            `SELECT id, prize_id, prize_name FROM lucky_wheel_rigged 
             WHERE wallet_address = ? AND used = 0 
             ORDER BY created_at ASC LIMIT 1`,
            [walletAddress.toLowerCase()]
        );
        
        if (rigged) {
            // 标记为已使用
            await dbQuery(
                `UPDATE lucky_wheel_rigged SET used = 1, used_at = NOW() WHERE id = ?`,
                [rigged.id]
            );
            
            // 根据 prize_id 找到奖品配置
            const prize = PRIZES.find(p => p.id === rigged.prize_id);
            if (prize) {
                console.log(`[LuckyWheel] 🎯 指定中奖生效: ${walletAddress.slice(0, 10)}... -> ${rigged.prize_name}`);
                return prize;
            }
        }
        
        return null;
    } catch (error) {
        console.error('[LuckyWheel] 检查指定中奖失败:', error);
        return null;
    }
}

/**
 * 添加用户幸运值
 * @param {string} walletAddress - 钱包地址
 * @param {number} points - 要添加的幸运值
 * @param {string} source - 来源描述
 */
export async function addLuckyPoints(walletAddress, points, source = 'system') {
    if (!dbQuery || !walletAddress || points <= 0) return;

    try {
        const normalizedAddress = walletAddress.toLowerCase();

        // 检查用户是否存在
        const existing = await dbQuery(
            'SELECT id FROM user_lucky_points WHERE wallet_address = ?',
            [normalizedAddress]
        );

        if (existing.length > 0) {
            // 更新幸运值
            await dbQuery(
                `UPDATE user_lucky_points 
                 SET lucky_points = lucky_points + ?,
                     total_earned = total_earned + ?
                 WHERE wallet_address = ?`,
                [points, points, normalizedAddress]
            );
        } else {
            // 创建新记录
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

// ==================== API 路由 ====================

/**
 * 获取用户幸运值
 * GET /api/lucky-wheel/points?wallet_address=xxx
 */
router.get('/points', async (req, res) => {
    try {
        const { wallet_address } = req.query;

        if (!wallet_address) {
            return res.status(400).json({
                success: false,
                message: '缺少钱包地址参数'
            });
        }

        const normalizedAddress = wallet_address.toLowerCase();

        const result = await dbQuery(
            'SELECT lucky_points, total_earned, total_spent FROM user_lucky_points WHERE wallet_address = ?',
            [normalizedAddress]
        );

        const userData = result[0] || { lucky_points: 0, total_earned: 0, total_spent: 0 };

        res.json({
            success: true,
            data: {
                luckyPoints: parseFloat(userData.lucky_points) || 0,
                totalEarned: parseFloat(userData.total_earned) || 0,
                totalSpent: parseFloat(userData.total_spent) || 0
            }
        });

    } catch (error) {
        console.error('[LuckyWheel] 获取幸运值失败:', error);
        res.status(500).json({
            success: false,
            message: '获取幸运值失败'
        });
    }
});

/**
 * 获取获奖公告
 * GET /api/lucky-wheel/announcements?limit=50
 */
router.get('/announcements', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const announcements = await dbQuery(
            `SELECT wallet_address as walletAddress, prize_name as prizeName, reward_display as rewardDisplay, created_at
             FROM lucky_wheel_announcements
             ORDER BY created_at DESC
             LIMIT ?`,
            [limit]
        );

        res.json({
            success: true,
            data: announcements
        });

    } catch (error) {
        console.error('[LuckyWheel] 获取公告失败:', error);
        res.status(500).json({
            success: false,
            message: '获取公告失败'
        });
    }
});

/**
 * 获取用户抽奖记录
 * GET /api/lucky-wheel/records?wallet_address=xxx&limit=20
 */
router.get('/records', async (req, res) => {
    try {
        const { wallet_address } = req.query;
        const limit = parseInt(req.query.limit) || 20;

        if (!wallet_address) {
            return res.status(400).json({
                success: false,
                message: '缺少钱包地址参数'
            });
        }

        const normalizedAddress = wallet_address.toLowerCase();

        const records = await dbQuery(
            `SELECT id, wheel_type, prize_id, prize_name, reward_type, reward_amount, points_spent, created_at
             FROM lucky_wheel_records
             WHERE wallet_address = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            [normalizedAddress, limit]
        );

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('[LuckyWheel] 获取记录失败:', error);
        res.status(500).json({
            success: false,
            message: '获取记录失败'
        });
    }
});

/**
 * 抽奖
 * POST /api/lucky-wheel/spin
 * Body: { wallet_address, wheel_type }
 */
router.post('/spin', async (req, res) => {
    try {
        const { wallet_address, wheel_type } = req.body;

        // 参数校验
        if (!wallet_address) {
            return res.status(400).json({
                success: false,
                message: '缺少钱包地址'
            });
        }

        if (!wheel_type || !WHEEL_TYPES[wheel_type]) {
            return res.status(400).json({
                success: false,
                message: '无效的转盘类型'
            });
        }

        const normalizedAddress = wallet_address.toLowerCase();
        const wheelConfig = WHEEL_TYPES[wheel_type];
        const requiredPoints = wheelConfig.requiredPoints;

        // 1. 检查用户幸运值是否足够
        const userPoints = await dbQuery(
            'SELECT lucky_points FROM user_lucky_points WHERE wallet_address = ?',
            [normalizedAddress]
        );

        const currentPoints = parseFloat(userPoints[0]?.lucky_points) || 0;

        if (currentPoints < requiredPoints) {
            return res.status(400).json({
                success: false,
                message: `幸运值不足，需要 ${requiredPoints}，当前 ${currentPoints}`
            });
        }

        // 2. 抽取奖品（先检查是否有指定中奖，没有则随机）
        let prize = await checkRiggedPrize(normalizedAddress);
        const isRigged = !!prize;
        
        if (!prize) {
            prize = getRandomPrize();
        }
        
        const actualReward = prize.rewardAmount * wheelConfig.multiplier;

        // 3. 扣除幸运值
        await dbQuery(
            `UPDATE user_lucky_points 
             SET lucky_points = lucky_points - ?,
                 total_spent = total_spent + ?
             WHERE wallet_address = ?`,
            [requiredPoints, requiredPoints, normalizedAddress]
        );

        // 4. 记录抽奖结果
        await dbQuery(
            `INSERT INTO lucky_wheel_records 
             (wallet_address, wheel_type, prize_id, prize_name, reward_type, reward_amount, points_spent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [normalizedAddress, wheel_type, prize.id, prize.name, prize.rewardType, actualReward, requiredPoints]
        );

        // 5. 如果中奖 WLD，添加到用户余额
        if (prize.rewardType === 'WLD') {
            // 检查用户是否存在
            const existingUser = await dbQuery(
                'SELECT wallet_address FROM user_balances WHERE wallet_address = ?',
                [normalizedAddress]
            );
            
            if (!existingUser || existingUser.length === 0) {
                // 创建新用户记录
                await dbQuery(
                    `INSERT INTO user_balances (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at) 
                     VALUES (?, 0, ?, 0, 0, NOW(), NOW())`,
                    [normalizedAddress, actualReward]
                );
            } else {
                // 更新现有用户的 WLD 余额
                await dbQuery(
                    `UPDATE user_balances SET wld_balance = wld_balance + ?, updated_at = NOW() WHERE wallet_address = ?`,
                    [actualReward, normalizedAddress]
                );
            }
            console.log(`[LuckyWheel] 用户 ${normalizedAddress.slice(0, 10)}... 获得 ${actualReward} WLD`);
        }

        // 6. 添加获奖公告（非虚拟）
        const walletDisplay = `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
        const rewardDisplay = `+${actualReward} ${prize.rewardType}`;

        await dbQuery(
            `INSERT INTO lucky_wheel_announcements (wallet_address, prize_name, reward_display, is_virtual)
             VALUES (?, ?, ?, 0)`,
            [walletDisplay, prize.name, rewardDisplay]
        );

        // 7. 获取剩余幸运值
        const remainingResult = await dbQuery(
            'SELECT lucky_points FROM user_lucky_points WHERE wallet_address = ?',
            [normalizedAddress]
        );
        const remainingPoints = parseFloat(remainingResult[0]?.lucky_points) || 0;

        // 8. 返回结果
        res.json({
            success: true,
            data: {
                prize: {
                    id: prize.id,
                    name: prize.name,
                    rewardType: prize.rewardType,
                    rewardAmount: actualReward
                },
                remainingPoints: remainingPoints,
                wheelType: wheel_type
            }
        });

        console.log(`[LuckyWheel] 用户 ${normalizedAddress.slice(0, 10)}... 抽中 ${prize.name}: ${actualReward} ${prize.rewardType}`);

    } catch (error) {
        console.error('[LuckyWheel] 抽奖失败:', error);
        res.status(500).json({
            success: false,
            message: '抽奖失败，请重试'
        });
    }
});

/**
 * 获取转盘配置
 * GET /api/lucky-wheel/config
 */
router.get('/config', async (req, res) => {
    res.json({
        success: true,
        data: {
            wheelTypes: WHEEL_TYPES,
            prizes: PRIZES.map(p => ({
                id: p.id,
                name: p.name,
                rewardType: p.rewardType,
                rewardAmount: p.rewardAmount
            }))
        }
    });
});

export default router;
