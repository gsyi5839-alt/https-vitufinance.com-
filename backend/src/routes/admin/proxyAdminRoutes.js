/**
 * Proxy Admin Routes
 * Description: Admin endpoints for managing proxy nodes and subscriptions
 */

import express from 'express';

const router = express.Router();

// Database query function reference
let dbQuery = null;

/**
 * Set database query function from main server
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
    console.log('[ProxyAdminRoutes] Database query function initialized');
}

// ========================= Node Management Routes =========================

/**
 * GET /nodes
 * Get all proxy nodes with pagination
 */
router.get('/nodes', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status !== undefined) {
            whereClause += ' AND status = ?';
            params.push(Number(status));
        }

        // Get total count
        const countResult = await dbQuery(
            `SELECT COUNT(*) as total FROM proxy_nodes WHERE ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        // Get nodes with pagination
        const nodes = await dbQuery(
            `SELECT id, name, proxy_type, server, port, cipher, status, 
                    sort_order, traffic_limit, expires_at, created_at, updated_at
             FROM proxy_nodes 
             WHERE ${whereClause}
             ORDER BY sort_order ASC, id DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        return res.json({
            success: true,
            data: {
                list: nodes,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error fetching nodes:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch nodes' });
    }
});

/**
 * GET /nodes/:id
 * Get a single proxy node by ID
 */
router.get('/nodes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const nodes = await dbQuery(
            'SELECT * FROM proxy_nodes WHERE id = ?',
            [id]
        );

        if (!nodes || nodes.length === 0) {
            return res.status(404).json({ success: false, message: 'Node not found' });
        }

        return res.json({ success: true, data: nodes[0] });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error fetching node:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch node' });
    }
});

/**
 * POST /nodes
 * Create a new proxy node
 */
router.post('/nodes', async (req, res) => {
    try {
        const {
            name, proxy_type, server, port, password, cipher,
            extra_config, status, sort_order, traffic_limit, expires_at
        } = req.body;

        // Validate required fields
        if (!name || !server || !port) {
            return res.status(400).json({
                success: false,
                message: 'Name, server, and port are required'
            });
        }

        // Insert new node
        const result = await dbQuery(
            `INSERT INTO proxy_nodes 
             (name, proxy_type, server, port, password, cipher, extra_config, 
              status, sort_order, traffic_limit, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                proxy_type || 'ss',
                server,
                port,
                password || null,
                cipher || 'aes-256-gcm',
                extra_config ? JSON.stringify(extra_config) : null,
                status !== undefined ? status : 1,
                sort_order || 100,
                traffic_limit || 0,
                expires_at || null
            ]
        );

        return res.json({
            success: true,
            message: 'Node created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error creating node:', error);
        return res.status(500).json({ success: false, message: 'Failed to create node' });
    }
});

/**
 * PUT /nodes/:id
 * Update an existing proxy node
 */
router.put('/nodes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, proxy_type, server, port, password, cipher,
            extra_config, status, sort_order, traffic_limit, expires_at
        } = req.body;

        // Check if node exists
        const existing = await dbQuery('SELECT id FROM proxy_nodes WHERE id = ?', [id]);
        if (!existing || existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Node not found' });
        }

        // Build dynamic update query
        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (proxy_type !== undefined) { updates.push('proxy_type = ?'); params.push(proxy_type); }
        if (server !== undefined) { updates.push('server = ?'); params.push(server); }
        if (port !== undefined) { updates.push('port = ?'); params.push(port); }
        if (password !== undefined) { updates.push('password = ?'); params.push(password); }
        if (cipher !== undefined) { updates.push('cipher = ?'); params.push(cipher); }
        if (extra_config !== undefined) {
            updates.push('extra_config = ?');
            params.push(extra_config ? JSON.stringify(extra_config) : null);
        }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
        if (traffic_limit !== undefined) { updates.push('traffic_limit = ?'); params.push(traffic_limit); }
        if (expires_at !== undefined) { updates.push('expires_at = ?'); params.push(expires_at); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        params.push(id);
        await dbQuery(
            `UPDATE proxy_nodes SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        return res.json({ success: true, message: 'Node updated successfully' });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error updating node:', error);
        return res.status(500).json({ success: false, message: 'Failed to update node' });
    }
});

/**
 * DELETE /nodes/:id
 * Delete a proxy node
 */
router.delete('/nodes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await dbQuery('DELETE FROM proxy_nodes WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Node not found' });
        }

        return res.json({ success: true, message: 'Node deleted successfully' });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error deleting node:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete node' });
    }
});

/**
 * PUT /nodes/:id/toggle
 * Toggle node status (enable/disable)
 */
router.put('/nodes/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;

        // Get current status
        const nodes = await dbQuery('SELECT status FROM proxy_nodes WHERE id = ?', [id]);
        if (!nodes || nodes.length === 0) {
            return res.status(404).json({ success: false, message: 'Node not found' });
        }

        const newStatus = nodes[0].status === 1 ? 0 : 1;
        await dbQuery('UPDATE proxy_nodes SET status = ? WHERE id = ?', [newStatus, id]);

        return res.json({
            success: true,
            message: `Node ${newStatus === 1 ? 'enabled' : 'disabled'} successfully`,
            data: { status: newStatus }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error toggling node:', error);
        return res.status(500).json({ success: false, message: 'Failed to toggle node' });
    }
});

// ========================= Subscription Management Routes =========================

/**
 * GET /subscriptions
 * Get all subscriptions with pagination
 */
router.get('/subscriptions', async (req, res) => {
    try {
        const { page = 1, limit = 20, status, user_id } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        const params = [];

        if (status !== undefined) {
            whereClause += ' AND status = ?';
            params.push(Number(status));
        }
        if (user_id) {
            whereClause += ' AND user_id = ?';
            params.push(user_id);
        }

        // Get total count
        const countResult = await dbQuery(
            `SELECT COUNT(*) as total FROM proxy_subscriptions WHERE ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        // Get subscriptions with pagination
        const subscriptions = await dbQuery(
            `SELECT id, user_id, subscription_token, name, access_level,
                    traffic_used, traffic_limit, status, expires_at,
                    last_update_at, last_device, created_at, updated_at
             FROM proxy_subscriptions 
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        return res.json({
            success: true,
            data: {
                list: subscriptions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error fetching subscriptions:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
    }
});

/**
 * PUT /subscriptions/:id/toggle
 * Toggle subscription status (enable/disable)
 */
router.put('/subscriptions/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;

        // Get current status
        const subs = await dbQuery('SELECT status FROM proxy_subscriptions WHERE id = ?', [id]);
        if (!subs || subs.length === 0) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const newStatus = subs[0].status === 1 ? 0 : 1;
        await dbQuery('UPDATE proxy_subscriptions SET status = ? WHERE id = ?', [newStatus, id]);

        return res.json({
            success: true,
            message: `Subscription ${newStatus === 1 ? 'enabled' : 'disabled'} successfully`,
            data: { status: newStatus }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error toggling subscription:', error);
        return res.status(500).json({ success: false, message: 'Failed to toggle subscription' });
    }
});

/**
 * DELETE /subscriptions/:id
 * Delete a subscription
 */
router.delete('/subscriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Delete access logs first
        await dbQuery('DELETE FROM proxy_access_logs WHERE subscription_id = ?', [id]);

        // Delete subscription
        const result = await dbQuery('DELETE FROM proxy_subscriptions WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        return res.json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error deleting subscription:', error);
        return res.status(500).json({ success: false, message: 'Failed to delete subscription' });
    }
});

/**
 * GET /stats
 * Get proxy system statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // Get node stats
        const nodeStats = await dbQuery(`
            SELECT 
                COUNT(*) as total_nodes,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_nodes
            FROM proxy_nodes
        `);

        // Get subscription stats
        const subStats = await dbQuery(`
            SELECT 
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_subscriptions,
                COUNT(DISTINCT user_id) as unique_users
            FROM proxy_subscriptions
        `);

        // Get access log stats (last 24 hours)
        const accessStats = await dbQuery(`
            SELECT COUNT(*) as access_count_24h
            FROM proxy_access_logs 
            WHERE accessed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        return res.json({
            success: true,
            data: {
                nodes: {
                    total: nodeStats[0]?.total_nodes || 0,
                    active: nodeStats[0]?.active_nodes || 0
                },
                subscriptions: {
                    total: subStats[0]?.total_subscriptions || 0,
                    active: subStats[0]?.active_subscriptions || 0,
                    unique_users: subStats[0]?.unique_users || 0
                },
                access: {
                    last_24h: accessStats[0]?.access_count_24h || 0
                }
            }
        });
    } catch (error) {
        console.error('[ProxyAdminRoutes] Error fetching stats:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// Export router and functions
export { router };
export default router;

