import { getDbQuery } from './proxyDbContext.js';

/**
 * Initialize proxy subscription tables.
 */
export async function initProxyTables() {
    let dbQuery;

    try {
        dbQuery = getDbQuery();
    } catch (error) {
        console.error(error.message);
        return;
    }

    try {
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
