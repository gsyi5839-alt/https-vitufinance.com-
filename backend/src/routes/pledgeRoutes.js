import express from 'express';
import {
    isValidWalletAddress,
    normalizeWalletAddress,
    secureLog
} from '../security/index.js';
import { sensitiveLimiter } from '../middleware/security.js';

export async function initPledgeTables(dbQuery) {
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS pledge_products (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(50) NOT NULL COMMENT '产品名称',
                amount DECIMAL(18,2) NOT NULL COMMENT '质押金额(WLD)',
                income DECIMAL(18,2) NOT NULL COMMENT '总收益(WLD)',
                cycle INT(11) NOT NULL COMMENT '运行周期(天)',
                daily_rate DECIMAL(10,6) NOT NULL COMMENT '日收益率',
                max_pieces INT(11) NOT NULL DEFAULT 100 COMMENT '最大持有数量',
                status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 1启用 0禁用',
                sort_order INT(11) NOT NULL DEFAULT 0 COMMENT '排序',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质押产品表'
        `);

        await dbQuery(`
            CREATE TABLE IF NOT EXISTS user_pledges (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                wallet_address VARCHAR(42) NOT NULL COMMENT '钱包地址',
                product_id INT(11) UNSIGNED NOT NULL COMMENT '产品ID',
                product_name VARCHAR(50) NOT NULL COMMENT '产品名称',
                amount DECIMAL(18,2) NOT NULL COMMENT '质押金额(WLD)',
                total_income DECIMAL(18,2) NOT NULL COMMENT '预期总收益(WLD)',
                daily_income DECIMAL(18,6) NOT NULL COMMENT '每日收益(WLD)',
                earned_income DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '已获收益(WLD)',
                cycle INT(11) NOT NULL COMMENT '周期(天)',
                status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active' COMMENT '状态',
                start_date DATE NOT NULL COMMENT '开始日期',
                end_date DATE NOT NULL COMMENT '结束日期',
                last_earn_date DATE DEFAULT NULL COMMENT '上次收益发放日期',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_wallet (wallet_address),
                KEY idx_status (status),
                KEY idx_end_date (end_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户质押记录表'
        `);

        const products = await dbQuery('SELECT COUNT(*) as count FROM pledge_products');
        if (products[0].count === 0) {
            await dbQuery(`
                INSERT INTO pledge_products (name, amount, income, cycle, daily_rate, max_pieces, sort_order) VALUES
                ('WLD-01', 100, 730, 365, 2.0000, 100, 1),
                ('WLD-02', 1000, 3650, 365, 1.0000, 50, 2),
                ('WLD-03', 10000, 54750, 365, 1.5000, 50, 3)
            `);
            console.log('[DB] 质押产品初始化完成');
        }
        console.log('[DB] 质押表初始化完成');
    } catch (error) {
        console.error('[DB] 初始化质押表失败:', error.message);
    }
}

function requireWallet(walletAddress, res) {
    if (!walletAddress || !isValidWalletAddress(walletAddress)) {
        res.status(400).json({
            success: false,
            message: 'Invalid wallet address'
        });
        return null;
    }
    return normalizeWalletAddress(walletAddress);
}

export function createPledgeRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/products', async (req, res) => {
        try {
            const products = await dbQuery(`
                SELECT id, name, amount, income, cycle, daily_rate, max_pieces
                FROM pledge_products
                WHERE status = 1
                ORDER BY sort_order ASC
            `);

            res.json({ success: true, data: products });
        } catch (error) {
            console.error('[API] Get pledge products error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pledge products'
            });
        }
    });

    router.post('/create', sensitiveLimiter, async (req, res) => {
        try {
            const { wallet_address, product_id } = req.body;
            const walletAddr = requireWallet(wallet_address, res);
            if (!walletAddr) return;

            if (!product_id || isNaN(product_id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            const products = await dbQuery(
                'SELECT * FROM pledge_products WHERE id = ? AND status = 1',
                [product_id]
            );
            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const product = products[0];
            const userPledges = await dbQuery(
                'SELECT COUNT(*) as count FROM user_pledges WHERE wallet_address = ? AND product_id = ? AND status = "active"',
                [walletAddr, product_id]
            );
            if (userPledges[0].count >= product.max_pieces) {
                return res.status(400).json({
                    success: false,
                    message: `已达到该产品最大持有数量 ${product.max_pieces} 个`
                });
            }

            const balances = await dbQuery(
                'SELECT wld_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            if (balances.length === 0 || parseFloat(balances[0].wld_balance) < parseFloat(product.amount)) {
                return res.status(400).json({
                    success: false,
                    message: 'WLD余额不足'
                });
            }

            const dailyIncome = parseFloat(product.income) / parseFloat(product.cycle);
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + parseInt(product.cycle));

            await dbQuery(
                'UPDATE user_balances SET wld_balance = wld_balance - ? WHERE wallet_address = ?',
                [product.amount, walletAddr]
            );

            const result = await dbQuery(
                `INSERT INTO user_pledges
                 (wallet_address, product_id, product_name, amount, total_income, daily_income, cycle, start_date, end_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    walletAddr,
                    product.id,
                    product.name,
                    product.amount,
                    product.income,
                    dailyIncome,
                    product.cycle,
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                ]
            );

            secureLog('质押创建成功', { wallet_address: walletAddr, product: product.name, amount: product.amount });

            res.json({
                success: true,
                message: '质押成功',
                data: {
                    pledge_id: result.insertId,
                    product_name: product.name,
                    amount: product.amount,
                    total_income: product.income,
                    daily_income: dailyIncome.toFixed(6),
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0]
                }
            });
        } catch (error) {
            console.error('[API] Create pledge error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to create pledge'
            });
        }
    });

    router.get('/my', async (req, res) => {
        try {
            const walletAddr = requireWallet(req.query.wallet_address, res);
            if (!walletAddr) return;

            const pledges = await dbQuery(`
                SELECT
                    id, product_id, product_name, amount, total_income, daily_income,
                    earned_income, cycle, status, start_date, end_date,
                    DATEDIFF(end_date, CURDATE()) as remaining_days,
                    created_at
                FROM user_pledges
                WHERE wallet_address = ? AND status = 'active'
                ORDER BY created_at DESC
            `, [walletAddr]);

            res.json({ success: true, data: pledges });
        } catch (error) {
            console.error('[API] Get my pledges error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pledges'
            });
        }
    });

    router.get('/expired', async (req, res) => {
        try {
            const walletAddr = requireWallet(req.query.wallet_address, res);
            if (!walletAddr) return;

            await dbQuery(`
                UPDATE user_pledges
                SET status = 'completed'
                WHERE wallet_address = ? AND status = 'active' AND end_date < CURDATE()
            `, [walletAddr]);

            const pledges = await dbQuery(`
                SELECT
                    id, product_id, product_name, amount, total_income, daily_income,
                    earned_income, cycle, status, start_date, end_date, created_at
                FROM user_pledges
                WHERE wallet_address = ? AND status IN ('completed', 'cancelled')
                ORDER BY end_date DESC
            `, [walletAddr]);

            res.json({ success: true, data: pledges });
        } catch (error) {
            console.error('[API] Get expired pledges error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch expired pledges'
            });
        }
    });

    router.get('/stats', async (req, res) => {
        try {
            const walletAddr = requireWallet(req.query.wallet_address, res);
            if (!walletAddr) return;

            const stats = await dbQuery(`
                SELECT
                    COUNT(*) as total_pledges,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_pledges,
                    SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END) as total_staked,
                    SUM(earned_income) as total_earned
                FROM user_pledges
                WHERE wallet_address = ?
            `, [walletAddr]);

            res.json({
                success: true,
                data: {
                    total_pledges: stats[0].total_pledges || 0,
                    active_pledges: stats[0].active_pledges || 0,
                    total_staked: parseFloat(stats[0].total_staked || 0).toFixed(2),
                    total_earned: parseFloat(stats[0].total_earned || 0).toFixed(6)
                }
            });
        } catch (error) {
            console.error('[API] Get pledge stats error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pledge stats'
            });
        }
    });

    return router;
}
