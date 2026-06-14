/**
 * 抽奖转盘路由模块
 * 功能：幸运转盘抽奖、幸运值管理、中奖记录
 */

import express from 'express';
import {
    addLuckyPoints,
    checkRiggedPrize,
    getLuckyWheelDbQuery,
    getRandomPrize,
    initLuckyWheelTables,
    PRIZES,
    setDbQuery,
    WHEEL_TYPES
} from '../services/luckyWheelService.js';

const router = express.Router();

export { addLuckyPoints, initLuckyWheelTables, setDbQuery };

function dbQuery(sql, params = []) {
    return getLuckyWheelDbQuery()(sql, params);
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

        // 2. SECURITY: 先原子扣除幸运值（带 lucky_points >= ? 守卫），成功后才抽奖。
        // 防止并发 /spin 各自通过上面的 SELECT 检查后重复抽奖、刷取免费奖励。
        const deduct = await dbQuery(
            `UPDATE user_lucky_points
             SET lucky_points = lucky_points - ?,
                 total_spent = total_spent + ?
             WHERE wallet_address = ? AND lucky_points >= ?`,
            [requiredPoints, requiredPoints, normalizedAddress, requiredPoints]
        );

        if (!deduct || deduct.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: `幸运值不足，需要 ${requiredPoints}`
            });
        }

        // 3. 抽取奖品（先检查是否有指定中奖，没有则随机）
        let prize = await checkRiggedPrize(normalizedAddress);
        const isRigged = !!prize;

        if (!prize) {
            prize = getRandomPrize();
        }

        const actualReward = prize.rewardAmount * wheelConfig.multiplier;

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
