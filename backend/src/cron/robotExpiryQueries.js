import { getDbQuery } from './robotExpiryState.js';

async function getUpcomingExpirations(hoursAhead = 24) {
    const dbQuery = getDbQuery();
    if (!dbQuery) return [];

    try {
        return await dbQuery(
            `SELECT *, TIMESTAMPDIFF(HOUR, NOW(), end_time) as hours_remaining
            FROM robot_purchases
            WHERE status = 'active'
            AND end_time > NOW()
            AND end_time <= DATE_ADD(NOW(), INTERVAL ? HOUR)
            ORDER BY end_time ASC`,
            [hoursAhead]
        );
    } catch (error) {
        console.error('[Cron] Failed to get upcoming expirations:', error.message);
        return [];
    }
}

async function getExpiryStats() {
    const dbQuery = getDbQuery();
    if (!dbQuery) return null;

    try {
        const todayExpiring = await dbQuery(
            `SELECT COUNT(*) as count, SUM(price) as total_value
            FROM robot_purchases
            WHERE status = 'active' AND DATE(end_time) = CURDATE()`
        );

        const weekExpiring = await dbQuery(
            `SELECT COUNT(*) as count, SUM(price) as total_value
            FROM robot_purchases
            WHERE status = 'active'
            AND end_time > NOW()
            AND end_time <= DATE_ADD(NOW(), INTERVAL 7 DAY)`
        );

        const pendingExpired = await dbQuery(
            `SELECT COUNT(*) as count, SUM(price) as total_value
            FROM robot_purchases
            WHERE status = 'active' AND end_time <= NOW()`
        );

        return {
            today: {
                count: todayExpiring[0]?.count || 0,
                total_value: parseFloat(todayExpiring[0]?.total_value || 0)
            },
            week: {
                count: weekExpiring[0]?.count || 0,
                total_value: parseFloat(weekExpiring[0]?.total_value || 0)
            },
            pending: {
                count: pendingExpired[0]?.count || 0,
                total_value: parseFloat(pendingExpired[0]?.total_value || 0)
            }
        };
    } catch (error) {
        console.error('[Cron] Failed to get expiry stats:', error.message);
        return null;
    }
}

export {
    getUpcomingExpirations,
    getExpiryStats
};
