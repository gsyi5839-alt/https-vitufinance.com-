import express from 'express';

export async function initAnnouncementTable(dbQuery) {
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                content TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表'
        `);

        const existingAnnouncements = await dbQuery('SELECT COUNT(*) as count FROM announcements');
        if (existingAnnouncements[0].count === 0) {
            await dbQuery(`
                INSERT INTO announcements (title, content, status, sort_order) VALUES
                ('Welcome to Vitu Finance! Start your AI-powered crypto journey.',
                 'Welcome to Vitu Finance! We are a leading AI-powered cryptocurrency trading platform designed to help you maximize your investment potential. Our advanced AI robots analyze market trends 24/7 to identify the best trading opportunities for you.',
                 'active', 100),
                ('Worldcoin WLD Staking Benefits',
                 'Worldcoin aims to provide universal access to the global economy, no matter what country you are from or what background you come from. Create a place for all of us to benefit in the era of artificial intelligence, where you can stake your WLD to get more benefits.',
                 'active', 90),
                ('AI Robot Trading Guide',
                 'Our AI Robots work by analyzing market data, identifying trends, and executing trades automatically. CEX Robots operate on centralized exchanges like Binance and OKX, while DEX Robots trade on decentralized platforms for maximum security and privacy.',
                 'active', 80),
                ('Grid Trading & High-Frequency Trading',
                 'Grid Trading creates a grid of buy and sell orders at predetermined price intervals, profiting from market volatility. High-Frequency Trading uses advanced algorithms to execute thousands of trades per second, capturing small price differences.',
                 'active', 70),
                ('Referral Program - Earn While You Share',
                 'Join our referral program and earn up to 10 levels of rewards! Share your unique referral code with friends and earn a percentage of their trading profits. The more you refer, the higher your rewards.',
                 'active', 60)
            `);
            console.log('[DB] 默认公告初始化完成');
        }
        console.log('[DB] 公告表初始化完成');
    } catch (error) {
        console.error('[DB] 初始化公告表失败:', error.message);
    }
}

function resolveTranslatedAnnouncement(row, language) {
    let title = row.title;
    let content = row.content;

    try {
        if (row.title_translations) {
            const titleTranslations = typeof row.title_translations === 'string'
                ? JSON.parse(row.title_translations)
                : row.title_translations;
            title = titleTranslations[language] || titleTranslations.en || row.title;
        }

        if (row.content_translations) {
            const contentTranslations = typeof row.content_translations === 'string'
                ? JSON.parse(row.content_translations)
                : row.content_translations;
            content = contentTranslations[language] || contentTranslations.en || row.content;
        }
    } catch (error) {
        console.error('解析翻译数据失败:', error.message);
    }

    return {
        id: row.id,
        title,
        content,
        show: false
    };
}

export function createAnnouncementRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/', async (req, res) => {
        try {
            const language = req.headers['accept-language'] || 'en';
            const rows = await dbQuery(
                'SELECT id, title, title_translations, content, content_translations, created_at, status FROM announcements WHERE status = ? ORDER BY sort_order DESC, created_at DESC',
                ['active']
            );

            res.json({
                code: 200,
                msg: 'success',
                info: {
                    notice: rows.map((row) => resolveTranslatedAnnouncement(row, language))
                }
            });
        } catch (error) {
            console.error('获取公告列表失败:', error.message);
            res.status(500).json({
                code: 500,
                msg: 'Failed to fetch announcements',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/:id', async (req, res) => {
        try {
            const rows = await dbQuery('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            res.json({
                success: true,
                data: rows[0]
            });
        } catch (error) {
            console.error('获取公告详情失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch announcement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const { title, content, status = 'active', sort_order = 0 } = req.body;
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            const result = await dbQuery(
                'INSERT INTO announcements (title, content, status, sort_order) VALUES (?, ?, ?, ?)',
                [title, content, status, sort_order]
            );

            res.json({
                success: true,
                message: 'Announcement created successfully',
                data: { id: result.insertId, title, content, status, sort_order }
            });
        } catch (error) {
            console.error('创建公告失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to create announcement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { title, content, status, sort_order } = req.body;
            const updates = [];
            const values = [];

            if (title !== undefined) updates.push('title = ?') && values.push(title);
            if (content !== undefined) updates.push('content = ?') && values.push(content);
            if (status !== undefined) updates.push('status = ?') && values.push(status);
            if (sort_order !== undefined) updates.push('sort_order = ?') && values.push(sort_order);

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            values.push(req.params.id);
            const result = await dbQuery(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, values);
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            res.json({
                success: true,
                message: 'Announcement updated successfully'
            });
        } catch (error) {
            console.error('更新公告失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to update announcement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const result = await dbQuery('DELETE FROM announcements WHERE id = ?', [req.params.id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Announcement not found'
                });
            }

            res.json({
                success: true,
                message: 'Announcement deleted successfully'
            });
        } catch (error) {
            console.error('删除公告失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to delete announcement',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
