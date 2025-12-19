-- =====================================================
-- Proxy Subscription Tables Migration
-- Description: Tables for managing proxy nodes and user subscriptions
-- Created: 2025-12-19
-- =====================================================

-- Proxy Nodes Table: Store proxy server configurations
CREATE TABLE IF NOT EXISTS proxy_nodes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Node name displayed to users
    name VARCHAR(100) NOT NULL COMMENT 'Node display name',
    -- Proxy type: ss, vmess, trojan, etc.
    proxy_type VARCHAR(20) NOT NULL DEFAULT 'ss' COMMENT 'Proxy type: ss, vmess, trojan, hysteria2',
    -- Server address (IP or domain)
    server VARCHAR(255) NOT NULL COMMENT 'Server address',
    -- Server port
    port INT NOT NULL COMMENT 'Server port',
    -- Password or UUID for authentication
    password VARCHAR(255) DEFAULT NULL COMMENT 'Password or UUID',
    -- Encryption method (for ss: aes-256-gcm, chacha20-ietf-poly1305, etc.)
    cipher VARCHAR(50) DEFAULT 'aes-256-gcm' COMMENT 'Encryption cipher',
    -- Additional configuration in JSON format
    extra_config JSON DEFAULT NULL COMMENT 'Extra config in JSON format',
    -- Node status: 1=active, 0=disabled
    status TINYINT(1) DEFAULT 1 COMMENT 'Node status: 1=active, 0=disabled',
    -- Sort order (lower number = higher priority)
    sort_order INT DEFAULT 100 COMMENT 'Display order',
    -- Traffic limit in GB (0 = unlimited)
    traffic_limit BIGINT DEFAULT 0 COMMENT 'Traffic limit in bytes (0=unlimited)',
    -- Expiry date for the node (NULL = never expires)
    expires_at DATETIME DEFAULT NULL COMMENT 'Node expiry date',
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
    -- Indexes
    INDEX idx_status (status),
    INDEX idx_proxy_type (proxy_type),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Proxy server nodes';

-- User Subscriptions Table: Store user subscription links
CREATE TABLE IF NOT EXISTS proxy_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- User identifier (wallet address or user ID)
    user_id VARCHAR(100) NOT NULL COMMENT 'User identifier',
    -- Unique subscription token for the link
    subscription_token VARCHAR(64) NOT NULL UNIQUE COMMENT 'Unique subscription token',
    -- Subscription name for display
    name VARCHAR(100) DEFAULT 'Default' COMMENT 'Subscription name',
    -- Node access level (which nodes user can access)
    access_level INT DEFAULT 1 COMMENT 'Access level for node filtering',
    -- Traffic used in bytes
    traffic_used BIGINT DEFAULT 0 COMMENT 'Traffic used in bytes',
    -- Traffic limit in bytes (0 = unlimited)
    traffic_limit BIGINT DEFAULT 0 COMMENT 'Traffic limit in bytes (0=unlimited)',
    -- Subscription status: 1=active, 0=disabled
    status TINYINT(1) DEFAULT 1 COMMENT 'Subscription status: 1=active, 0=disabled',
    -- Expiry date
    expires_at DATETIME DEFAULT NULL COMMENT 'Subscription expiry date',
    -- Last update timestamp (when user fetched the subscription)
    last_update_at DATETIME DEFAULT NULL COMMENT 'Last subscription fetch time',
    -- Device info from last update
    last_device VARCHAR(255) DEFAULT NULL COMMENT 'Last device user-agent',
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Created timestamp',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated timestamp',
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_subscription_token (subscription_token),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User proxy subscriptions';

-- Access Log Table: Track subscription access for analytics
CREATE TABLE IF NOT EXISTS proxy_access_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- Subscription ID reference
    subscription_id INT NOT NULL COMMENT 'Reference to subscription',
    -- Client IP address
    ip_address VARCHAR(45) NOT NULL COMMENT 'Client IP address',
    -- User agent string
    user_agent VARCHAR(500) DEFAULT NULL COMMENT 'Client user agent',
    -- Access timestamp
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Access timestamp',
    -- Index for cleanup and queries
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_accessed_at (accessed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Subscription access logs';

-- Insert some sample proxy nodes (you should replace these with real nodes)
-- These are placeholders and will NOT work as real proxies
INSERT INTO proxy_nodes (name, proxy_type, server, port, password, cipher, extra_config, status, sort_order) VALUES
('示例节点1-香港', 'ss', '127.0.0.1', 8388, 'your_password_here', 'aes-256-gcm', NULL, 0, 1),
('示例节点2-日本', 'ss', '127.0.0.1', 8389, 'your_password_here', 'aes-256-gcm', NULL, 0, 2),
('示例节点3-美国', 'ss', '127.0.0.1', 8390, 'your_password_here', 'aes-256-gcm', NULL, 0, 3)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

