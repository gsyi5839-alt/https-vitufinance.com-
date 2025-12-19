-- Security Tables Initialization Script
-- Run this script to create all security-related tables

-- ==================== Blocked IPs Table ====================
-- Stores IP addresses that have been blocked
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE COMMENT 'IP address (supports IPv6)',
    blocked_at DATETIME NOT NULL COMMENT 'When the IP was blocked',
    duration_ms BIGINT NOT NULL COMMENT 'Block duration in milliseconds (-1 for permanent)',
    reason VARCHAR(255) NOT NULL COMMENT 'Reason for blocking',
    is_permanent TINYINT(1) DEFAULT 0 COMMENT 'Whether block is permanent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_address (ip_address),
    INDEX idx_blocked_at (blocked_at),
    INDEX idx_is_permanent (is_permanent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blocked IP addresses';

-- ==================== Attack Logs Table ====================
-- Stores all detected attack attempts
CREATE TABLE IF NOT EXISTS attack_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL COMMENT 'Attacker IP address',
    attack_type VARCHAR(50) NOT NULL COMMENT 'Type of attack (sql_injection, xss, etc)',
    severity VARCHAR(20) NOT NULL COMMENT 'Attack severity (low, medium, high, critical)',
    request_method VARCHAR(10) COMMENT 'HTTP method',
    request_path VARCHAR(500) COMMENT 'Request URL path',
    request_body TEXT COMMENT 'Request body (sanitized)',
    request_headers TEXT COMMENT 'Request headers (sensitive data hidden)',
    user_agent VARCHAR(500) COMMENT 'User agent string',
    referer VARCHAR(500) COMMENT 'Referer header',
    attack_details TEXT COMMENT 'Details about the attack',
    patterns_detected TEXT COMMENT 'JSON array of detected patterns',
    blocked TINYINT(1) DEFAULT 0 COMMENT 'Whether the IP was blocked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_address (ip_address),
    INDEX idx_attack_type (attack_type),
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at),
    INDEX idx_blocked (blocked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Attack attempt logs';

-- ==================== Attack Statistics Table ====================
-- Aggregated daily attack statistics
CREATE TABLE IF NOT EXISTS attack_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL COMMENT 'Statistics date',
    attack_type VARCHAR(50) NOT NULL COMMENT 'Type of attack',
    severity VARCHAR(20) NOT NULL COMMENT 'Attack severity',
    attack_count INT DEFAULT 0 COMMENT 'Number of attacks',
    unique_ips INT DEFAULT 0 COMMENT 'Number of unique IPs',
    blocked_count INT DEFAULT 0 COMMENT 'Number of blocked attacks',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_stat (stat_date, attack_type, severity),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily attack statistics';

-- ==================== File Protection Logs Table ====================
-- Logs file integrity issues and suspicious file operations
CREATE TABLE IF NOT EXISTS file_protection_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT 'Event type (file_modified, file_deleted, etc)',
    file_path VARCHAR(500) NOT NULL COMMENT 'Path to the file',
    file_hash VARCHAR(64) COMMENT 'Current file hash',
    previous_hash VARCHAR(64) COMMENT 'Previous file hash',
    detected_issue TEXT COMMENT 'Description of detected issue',
    ip_address VARCHAR(45) COMMENT 'Associated IP address',
    user_agent VARCHAR(500) COMMENT 'User agent if applicable',
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT 'Severity level',
    resolved TINYINT(1) DEFAULT 0 COMMENT 'Whether issue was resolved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_file_path (file_path(255)),
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File protection event logs';

-- ==================== IP Whitelist Table ====================
-- Stores trusted IP addresses that should never be blocked
CREATE TABLE IF NOT EXISTS ip_whitelist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE COMMENT 'Trusted IP address',
    description VARCHAR(255) COMMENT 'Description of why IP is whitelisted',
    added_by VARCHAR(100) COMMENT 'Who added this IP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Whitelisted IP addresses';

-- ==================== Security Events Table ====================
-- General security events log
CREATE TABLE IF NOT EXISTS security_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT 'Event type',
    severity VARCHAR(20) NOT NULL COMMENT 'Event severity',
    ip_address VARCHAR(45) COMMENT 'Related IP address',
    user_id INT COMMENT 'Related user ID if applicable',
    wallet_address VARCHAR(42) COMMENT 'Related wallet address',
    description TEXT NOT NULL COMMENT 'Event description',
    metadata JSON COMMENT 'Additional event data',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_severity (severity),
    INDEX idx_ip_address (ip_address),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='General security events';

-- ==================== Insert Default Whitelist ====================
-- Add localhost and common internal IPs to whitelist
INSERT IGNORE INTO ip_whitelist (ip_address, description, added_by) VALUES
('127.0.0.1', 'Localhost IPv4', 'system'),
('::1', 'Localhost IPv6', 'system'),
('localhost', 'Localhost hostname', 'system');

-- ==================== Cleanup Old Data Procedure ====================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS cleanup_old_security_data()
BEGIN
    -- Delete attack logs older than 90 days
    DELETE FROM attack_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Delete attack statistics older than 365 days
    DELETE FROM attack_statistics WHERE stat_date < DATE_SUB(NOW(), INTERVAL 365 DAY);
    
    -- Delete file protection logs older than 90 days
    DELETE FROM file_protection_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Delete expired non-permanent blocked IPs
    DELETE FROM blocked_ips 
    WHERE is_permanent = 0 
    AND blocked_at + INTERVAL (duration_ms / 1000) SECOND < NOW();
    
    -- Delete security events older than 180 days
    DELETE FROM security_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 180 DAY);
    
    SELECT 'Security data cleanup completed' AS result;
END //

DELIMITER ;

-- ==================== Create Event for Automatic Cleanup ====================
-- Run cleanup every day at 3:00 AM
CREATE EVENT IF NOT EXISTS security_data_cleanup_event
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 3 HOUR)
DO CALL cleanup_old_security_data();

-- Note: Event scheduler needs to be enabled by admin: SET GLOBAL event_scheduler = ON;
-- If you have SUPER privilege, uncomment the next line:
-- SET GLOBAL event_scheduler = ON;

SELECT 'Security tables created successfully!' AS status;

