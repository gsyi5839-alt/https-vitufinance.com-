import express from 'express';
import crypto from 'crypto';
import { getDbQuery } from '../services/proxyDbContext.js';
import { buildClashConfig } from '../utils/proxyClashConfig.js';

const router = express.Router();

function generateSubscriptionToken() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * GET /link/:token
 * Fetch subscription configuration by token.
 */
router.get('/link/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || token.length !== 32) {
            return res.status(400).send('# Invalid subscription token');
        }

        const dbQuery = getDbQuery();

        const subscriptions = await dbQuery(
            `SELECT * FROM proxy_subscriptions
             WHERE subscription_token = ? AND status = 1`,
            [token]
        );

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).send('# Subscription not found or disabled');
        }

        const subscription = subscriptions[0];

        if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
            return res.status(403).send('# Subscription has expired');
        }

        const nodes = await dbQuery(
            `SELECT * FROM proxy_nodes
             WHERE status = 1
             AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY sort_order ASC, id ASC`
        );

        if (!nodes || nodes.length === 0) {
            return res.status(200).send('# No active proxy nodes available');
        }

        const userAgent = req.headers['user-agent'] || 'Unknown';
        const clientIP = req.ip || req.connection.remoteAddress || 'Unknown';

        await dbQuery(
            `UPDATE proxy_subscriptions
             SET last_update_at = NOW(), last_device = ?
             WHERE id = ?`,
            [userAgent.substring(0, 255), subscription.id]
        );

        await dbQuery(
            `INSERT INTO proxy_access_logs (subscription_id, ip_address, user_agent)
             VALUES (?, ?, ?)`,
            [subscription.id, clientIP.substring(0, 45), userAgent.substring(0, 500)]
        );

        const config = buildClashConfig(nodes, subscription.name);

        res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${subscription.name}.yaml"`);
        res.setHeader('subscription-userinfo',
            `upload=0; download=${subscription.traffic_used}; ` +
            `total=${subscription.traffic_limit || 0}; ` +
            `expire=${subscription.expires_at ? Math.floor(new Date(subscription.expires_at).getTime() / 1000) : 0}`
        );

        return res.send(config);
    } catch (error) {
        console.error('[ProxyRoutes] Error fetching subscription:', error);
        return res.status(500).send('# Internal server error');
    }
});

/**
 * POST /subscription/create
 * Create a new subscription for a user.
 */
router.post('/subscription/create', async (req, res) => {
    try {
        const { user_id, name, expires_days, traffic_limit_gb } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        const dbQuery = getDbQuery();

        const token = generateSubscriptionToken();

        let expiresAt = null;
        if (expires_days && expires_days > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expires_days);
        }

        const trafficLimitBytes = traffic_limit_gb ? traffic_limit_gb * 1024 * 1024 * 1024 : 0;

        await dbQuery(
            `INSERT INTO proxy_subscriptions
             (user_id, subscription_token, name, traffic_limit, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, token, name || 'Default', trafficLimitBytes, expiresAt]
        );

        const baseUrl = process.env.PROXY_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const subscriptionUrl = `${baseUrl}/proxy/link/${token}`;

        return res.json({
            success: true,
            data: {
                token,
                url: subscriptionUrl,
                name: name || 'Default',
                expires_at: expiresAt,
                traffic_limit_gb: traffic_limit_gb || 0
            }
        });
    } catch (error) {
        console.error('[ProxyRoutes] Error creating subscription:', error);
        return res.status(500).json({ success: false, message: 'Failed to create subscription' });
    }
});

/**
 * GET /subscription/:userId
 * Get all subscriptions for a user.
 */
router.get('/subscription/:userId', async (req, res) => {
    try {
        const dbQuery = getDbQuery();
        const { userId } = req.params;

        const subscriptions = await dbQuery(
            `SELECT id, subscription_token, name, access_level,
                    traffic_used, traffic_limit, status, expires_at,
                    last_update_at, last_device, created_at
             FROM proxy_subscriptions
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        const baseUrl = process.env.PROXY_BASE_URL || `${req.protocol}://${req.get('host')}`;

        const result = subscriptions.map(sub => ({
            ...sub,
            url: `${baseUrl}/proxy/link/${sub.subscription_token}`,
            traffic_used_gb: (sub.traffic_used / (1024 * 1024 * 1024)).toFixed(2),
            traffic_limit_gb: sub.traffic_limit ? (sub.traffic_limit / (1024 * 1024 * 1024)).toFixed(2) : 'Unlimited'
        }));

        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('[ProxyRoutes] Error fetching subscriptions:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
    }
});

/**
 * DELETE /subscription/:id
 * Delete a subscription by ID.
 */
router.delete('/subscription/:id', async (req, res) => {
    try {
        const dbQuery = getDbQuery();
        const { id } = req.params;
        const { user_id } = req.body;

        if (user_id) {
            const existing = await dbQuery(
                'SELECT id FROM proxy_subscriptions WHERE id = ? AND user_id = ?',
                [id, user_id]
            );
            if (!existing || existing.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        await dbQuery('DELETE FROM proxy_subscriptions WHERE id = ?', [id]);

        return res.json({ success: true, message: 'Subscription deleted' });
    } catch (error) {
        console.error('[ProxyRoutes] Error deleting subscription:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete subscription' });
    }
});

export default router;
