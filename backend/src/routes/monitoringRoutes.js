import express from 'express';

export async function initUserBehaviorTable(dbQuery) {
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS user_behaviors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_address VARCHAR(100) DEFAULT NULL COMMENT '钱包地址（已连接则有）',
                ip_address VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
                user_agent TEXT COMMENT '浏览器信息',
                referral_code VARCHAR(20) DEFAULT NULL COMMENT '来源推荐码',
                action_type VARCHAR(50) NOT NULL COMMENT '行为类型',
                action_detail TEXT COMMENT '行为详情JSON',
                page_url VARCHAR(500) COMMENT '页面URL',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_wallet (wallet_address),
                INDEX idx_referral (referral_code),
                INDEX idx_action (action_type),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户行为记录表'
        `);
        console.log('[DB] 用户行为记录表初始化完成');
    } catch (error) {
        console.error('[DB] 初始化用户行为记录表失败:', error.message);
    }
}

export function createMonitoringRoutes({ dbQuery }) {
    const router = express.Router();

    router.post('/analytics/performance', (req, res) => {
        try {
            const performanceData = req.body;

            console.log('📊 Performance Metric:', {
                name: performanceData.name,
                value: `${performanceData.value.toFixed(2)}ms`,
                rating: performanceData.rating,
                url: performanceData.url
            });

            res.json({
                success: true,
                message: 'Performance data recorded'
            });
        } catch (error) {
            console.error('保存性能数据失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to save performance data'
            });
        }
    });

    router.post('/track-behavior', express.text({ type: 'text/plain' }), async (req, res) => {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch {
                    body = {};
                }
            }

            const { wallet_address, action_type, action_detail, page_url, referral_code } = body;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];

            if (!action_type) {
                return res.status(400).json({
                    success: false,
                    message: 'action_type is required'
                });
            }

            await dbQuery(
                `INSERT INTO user_behaviors (wallet_address, ip_address, user_agent, referral_code, action_type, action_detail, page_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    wallet_address || null,
                    ipAddress,
                    userAgent,
                    referral_code || null,
                    action_type,
                    JSON.stringify(action_detail || {}),
                    page_url
                ]
            );

            res.json({
                success: true,
                message: 'Behavior tracked'
            });
        } catch (error) {
            console.error('记录用户行为失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to track behavior'
            });
        }
    });

    return router;
}
