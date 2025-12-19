/**
 * Proxy Subscription Routes
 * Description: Handles proxy node management and subscription generation
 * Compatible with Clash Verge and other Clash-based clients
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Database query function reference (will be set from server.js)
let dbQuery = null;

/**
 * Set database query function from main server
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
    console.log('[ProxyRoutes] Database query function initialized');
}

/**
 * Initialize proxy subscription tables
 * Creates tables if they don't exist
 */
export async function initProxyTables() {
    if (!dbQuery) {
        console.error('[ProxyRoutes] Database query not set');
        return;
    }

    try {
        // Create proxy_nodes table
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS proxy_nodes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL COMMENT 'Node display name',
                proxy_type VARCHAR(20) NOT NULL DEFAULT 'ss' COMMENT 'Proxy type',
                server VARCHAR(255) NOT NULL COMMENT 'Server address',
                port INT NOT NULL COMMENT 'Server port',
                password VARCHAR(255) DEFAULT NULL COMMENT 'Password or UUID',
                cipher VARCHAR(50) DEFAULT 'aes-256-gcm' COMMENT 'Encryption cipher',
                extra_config JSON DEFAULT NULL COMMENT 'Extra config in JSON',
                status TINYINT(1) DEFAULT 1 COMMENT 'Status: 1=active, 0=disabled',
                sort_order INT DEFAULT 100 COMMENT 'Display order',
                traffic_limit BIGINT DEFAULT 0 COMMENT 'Traffic limit in bytes',
                expires_at DATETIME DEFAULT NULL COMMENT 'Expiry date',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_sort_order (sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create proxy_subscriptions table
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS proxy_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(100) NOT NULL COMMENT 'User identifier',
                subscription_token VARCHAR(64) NOT NULL UNIQUE COMMENT 'Unique token',
                name VARCHAR(100) DEFAULT 'Default' COMMENT 'Subscription name',
                access_level INT DEFAULT 1 COMMENT 'Access level',
                traffic_used BIGINT DEFAULT 0 COMMENT 'Traffic used in bytes',
                traffic_limit BIGINT DEFAULT 0 COMMENT 'Traffic limit in bytes',
                status TINYINT(1) DEFAULT 1 COMMENT 'Status: 1=active, 0=disabled',
                expires_at DATETIME DEFAULT NULL COMMENT 'Expiry date',
                last_update_at DATETIME DEFAULT NULL COMMENT 'Last fetch time',
                last_device VARCHAR(255) DEFAULT NULL COMMENT 'Last device',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_subscription_token (subscription_token),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create proxy_access_logs table
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS proxy_access_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                subscription_id INT NOT NULL COMMENT 'Subscription reference',
                ip_address VARCHAR(45) NOT NULL COMMENT 'Client IP',
                user_agent VARCHAR(500) DEFAULT NULL COMMENT 'User agent',
                accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_subscription_id (subscription_id),
                INDEX idx_accessed_at (accessed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('[ProxyRoutes] Proxy tables initialized successfully');
    } catch (error) {
        console.error('[ProxyRoutes] Failed to initialize tables:', error.message);
    }
}

/**
 * Generate a unique subscription token
 * @returns {string} 32-character hex token
 */
function generateSubscriptionToken() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Build Clash YAML configuration from nodes
 * @param {Array} nodes - Array of proxy node objects
 * @param {string} subscriptionName - Name for the subscription
 * @returns {string} YAML configuration string
 */
function buildClashConfig(nodes, subscriptionName = 'VituProxy') {
    const proxies = [];
    const proxyNames = [];

    // Build proxy list based on node type
    for (const node of nodes) {
        const proxyConfig = buildProxyConfig(node);
        if (proxyConfig) {
            proxies.push(proxyConfig);
            proxyNames.push(node.name);
        }
    }

    // Build the complete Clash configuration
    const config = {
        port: 7890,
        'socks-port': 7891,
        'allow-lan': false,
        mode: 'rule',
        'log-level': 'info',
        'external-controller': '127.0.0.1:9090',
        proxies: proxies,
        'proxy-groups': [
            {
                name: '🚀 节点选择',
                type: 'select',
                proxies: ['♻️ 自动选择', 'DIRECT', ...proxyNames]
            },
            {
                name: '♻️ 自动选择',
                type: 'url-test',
                proxies: proxyNames,
                url: 'http://www.gstatic.com/generate_204',
                interval: 300,
                tolerance: 50
            },
            {
                name: '🎯 全球直连',
                type: 'select',
                proxies: ['DIRECT', '🚀 节点选择']
            },
            {
                name: '🛑 广告拦截',
                type: 'select',
                proxies: ['REJECT', 'DIRECT']
            },
            {
                name: '🐟 漏网之鱼',
                type: 'select',
                proxies: ['🚀 节点选择', 'DIRECT', '♻️ 自动选择']
            }
        ],
        rules: [
            // Direct rules for Chinese services
            'DOMAIN-SUFFIX,cn,🎯 全球直连',
            'DOMAIN-KEYWORD,baidu,🎯 全球直连',
            'DOMAIN-KEYWORD,alibaba,🎯 全球直连',
            'DOMAIN-KEYWORD,taobao,🎯 全球直连',
            'DOMAIN-KEYWORD,qq,🎯 全球直连',
            'DOMAIN-KEYWORD,weixin,🎯 全球直连',
            'DOMAIN-KEYWORD,wechat,🎯 全球直连',
            // Ad blocking rules
            'DOMAIN-KEYWORD,adservice,🛑 广告拦截',
            'DOMAIN-KEYWORD,googleads,🛑 广告拦截',
            // Proxy rules for common blocked services
            'DOMAIN-SUFFIX,google.com,🚀 节点选择',
            'DOMAIN-SUFFIX,youtube.com,🚀 节点选择',
            'DOMAIN-SUFFIX,twitter.com,🚀 节点选择',
            'DOMAIN-SUFFIX,x.com,🚀 节点选择',
            'DOMAIN-SUFFIX,facebook.com,🚀 节点选择',
            'DOMAIN-SUFFIX,instagram.com,🚀 节点选择',
            'DOMAIN-SUFFIX,telegram.org,🚀 节点选择',
            'DOMAIN-SUFFIX,t.me,🚀 节点选择',
            'DOMAIN-SUFFIX,github.com,🚀 节点选择',
            'DOMAIN-SUFFIX,githubusercontent.com,🚀 节点选择',
            'DOMAIN-SUFFIX,openai.com,🚀 节点选择',
            'DOMAIN-SUFFIX,anthropic.com,🚀 节点选择',
            // GeoIP rules
            'GEOIP,CN,🎯 全球直连',
            // Final rule
            'MATCH,🐟 漏网之鱼'
        ]
    };

    // Convert to YAML format manually (simple implementation)
    return convertToYaml(config);
}

/**
 * Build individual proxy configuration based on type
 * @param {Object} node - Proxy node object from database
 * @returns {Object|null} Proxy config object or null if invalid
 */
function buildProxyConfig(node) {
    const baseConfig = {
        name: node.name,
        server: node.server,
        port: node.port
    };

    // Parse extra_config if it's a string
    let extraConfig = {};
    if (node.extra_config) {
        try {
            extraConfig = typeof node.extra_config === 'string' 
                ? JSON.parse(node.extra_config) 
                : node.extra_config;
        } catch (e) {
            console.warn(`[ProxyRoutes] Invalid extra_config for node ${node.name}`);
        }
    }

    switch (node.proxy_type.toLowerCase()) {
        case 'ss':
        case 'shadowsocks':
            return {
                ...baseConfig,
                type: 'ss',
                cipher: node.cipher || 'aes-256-gcm',
                password: node.password,
                ...extraConfig
            };

        case 'vmess':
            return {
                ...baseConfig,
                type: 'vmess',
                uuid: node.password,
                alterId: extraConfig.alterId || 0,
                cipher: extraConfig.cipher || 'auto',
                tls: extraConfig.tls || false,
                ...extraConfig
            };

        case 'trojan':
            return {
                ...baseConfig,
                type: 'trojan',
                password: node.password,
                sni: extraConfig.sni || node.server,
                'skip-cert-verify': extraConfig.skipCertVerify || false,
                ...extraConfig
            };

        case 'hysteria2':
        case 'hy2':
            return {
                ...baseConfig,
                type: 'hysteria2',
                password: node.password,
                sni: extraConfig.sni || node.server,
                'skip-cert-verify': extraConfig.skipCertVerify || false,
                ...extraConfig
            };

        case 'vless':
            return {
                ...baseConfig,
                type: 'vless',
                uuid: node.password,
                flow: extraConfig.flow || '',
                tls: extraConfig.tls || true,
                ...extraConfig
            };

        default:
            console.warn(`[ProxyRoutes] Unknown proxy type: ${node.proxy_type}`);
            return null;
    }
}

/**
 * Convert JavaScript object to YAML string
 * @param {Object} obj - Object to convert
 * @param {number} indent - Current indentation level
 * @returns {string} YAML formatted string
 */
function convertToYaml(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;

        if (Array.isArray(value)) {
            result += `${spaces}${key}:\n`;
            for (const item of value) {
                if (typeof item === 'object' && item !== null) {
                    result += `${spaces}  - `;
                    const itemYaml = convertToYaml(item, indent + 2);
                    // Remove leading spaces from first line and add the rest
                    const lines = itemYaml.split('\n').filter(l => l.trim());
                    result += lines[0].trim() + '\n';
                    for (let i = 1; i < lines.length; i++) {
                        result += `${spaces}    ${lines[i].trim()}\n`;
                    }
                } else {
                    result += `${spaces}  - ${formatYamlValue(item)}\n`;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            result += `${spaces}${key}:\n`;
            result += convertToYaml(value, indent + 1);
        } else {
            result += `${spaces}${key}: ${formatYamlValue(value)}\n`;
        }
    }

    return result;
}

/**
 * Format a value for YAML output
 * @param {*} value - Value to format
 * @returns {string} Formatted value string
 */
function formatYamlValue(value) {
    if (typeof value === 'string') {
        // Quote strings that contain special characters
        if (value.includes(':') || value.includes('#') || value.includes('"') ||
            value.includes("'") || value.startsWith(' ') || value.endsWith(' ')) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
}

// ========================= API Routes =========================

/**
 * GET /link/:token
 * Fetch subscription configuration by token
 * This is the main endpoint for Clash clients
 */
router.get('/link/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || token.length !== 32) {
            return res.status(400).send('# Invalid subscription token');
        }

        // Find subscription by token
        const subscriptions = await dbQuery(
            `SELECT * FROM proxy_subscriptions 
             WHERE subscription_token = ? AND status = 1`,
            [token]
        );

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).send('# Subscription not found or disabled');
        }

        const subscription = subscriptions[0];

        // Check if subscription has expired
        if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
            return res.status(403).send('# Subscription has expired');
        }

        // Get active proxy nodes
        const nodes = await dbQuery(
            `SELECT * FROM proxy_nodes 
             WHERE status = 1 
             AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY sort_order ASC, id ASC`
        );

        if (!nodes || nodes.length === 0) {
            return res.status(200).send('# No active proxy nodes available');
        }

        // Update subscription last access info
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const clientIP = req.ip || req.connection.remoteAddress || 'Unknown';
        
        await dbQuery(
            `UPDATE proxy_subscriptions 
             SET last_update_at = NOW(), last_device = ?
             WHERE id = ?`,
            [userAgent.substring(0, 255), subscription.id]
        );

        // Log access
        await dbQuery(
            `INSERT INTO proxy_access_logs (subscription_id, ip_address, user_agent)
             VALUES (?, ?, ?)`,
            [subscription.id, clientIP.substring(0, 45), userAgent.substring(0, 500)]
        );

        // Build and return Clash configuration
        const config = buildClashConfig(nodes, subscription.name);

        // Set appropriate headers for Clash clients
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
 * Create a new subscription for a user
 */
router.post('/subscription/create', async (req, res) => {
    try {
        const { user_id, name, expires_days, traffic_limit_gb } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        // Generate unique token
        const token = generateSubscriptionToken();

        // Calculate expiry date if specified
        let expiresAt = null;
        if (expires_days && expires_days > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expires_days);
        }

        // Convert GB to bytes for storage
        const trafficLimitBytes = traffic_limit_gb ? traffic_limit_gb * 1024 * 1024 * 1024 : 0;

        // Insert new subscription
        await dbQuery(
            `INSERT INTO proxy_subscriptions 
             (user_id, subscription_token, name, traffic_limit, expires_at)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, token, name || 'Default', trafficLimitBytes, expiresAt]
        );

        // Build subscription URL
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
 * Get all subscriptions for a user
 */
router.get('/subscription/:userId', async (req, res) => {
    try {
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
 * Delete a subscription by ID
 */
router.delete('/subscription/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        // Verify ownership if user_id is provided
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

// Export router and functions
export { router };
export default router;

