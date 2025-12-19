/**
 * Audit Logger Utility
 * Records important user and system actions for compliance and debugging
 */

// Audit log types
export const AuditLogType = {
    BALANCE_CHANGE: 'balance_change',
    USER_AUTH: 'user_auth',
    ADMIN_ACTION: 'admin_action',
    ROBOT_PURCHASE: 'robot_purchase',
    WITHDRAWAL: 'withdrawal',
    DEPOSIT: 'deposit',
    SETTINGS_CHANGE: 'settings_change'
};

// Audit log levels
export const AuditLogLevel = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

// Database query function
let dbQuery = null;

/**
 * Set database query function
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

/**
 * Initialize audit logs table
 */
export async function initAuditLogsTable() {
    if (!dbQuery) {
        console.warn('[AuditLogger] Database not connected');
        return;
    }
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                log_type VARCHAR(50) NOT NULL,
                log_level VARCHAR(20) NOT NULL DEFAULT 'info',
                wallet_address VARCHAR(42),
                admin_user VARCHAR(50),
                action VARCHAR(255) NOT NULL,
                details JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_log_type (log_type),
                INDEX idx_wallet (wallet_address),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[AuditLogger] Audit logs table initialized');
    } catch (error) {
        console.error('[AuditLogger] Failed to initialize table:', error.message);
    }
}

/**
 * Log an audit entry
 * @param {Object} options - Audit log options
 */
async function logAudit({
    logType,
    logLevel = AuditLogLevel.INFO,
    walletAddress = null,
    adminUser = null,
    action,
    details = null,
    ipAddress = null,
    userAgent = null
}) {
    // Console log
    console.log(`[Audit] [${logType}] [${logLevel}] ${action}`);
    
    if (!dbQuery) return;
    
    try {
        await dbQuery(
            `INSERT INTO audit_logs (log_type, log_level, wallet_address, admin_user, action, details, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                logType,
                logLevel,
                walletAddress?.toLowerCase(),
                adminUser,
                action,
                details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent
            ]
        );
    } catch (error) {
        console.error('[AuditLogger] Failed to log:', error.message);
    }
}

/**
 * Log balance change
 */
export async function auditBalanceChange({
    walletAddress,
    changeType,
    amount,
    balanceBefore,
    balanceAfter,
    relatedId = null,
    ipAddress = null
}) {
    await logAudit({
        logType: AuditLogType.BALANCE_CHANGE,
        logLevel: Math.abs(amount) > 1000 ? AuditLogLevel.WARNING : AuditLogLevel.INFO,
        walletAddress,
        action: `Balance ${amount >= 0 ? 'increased' : 'decreased'} by ${Math.abs(amount)} (${changeType})`,
        details: {
            changeType,
            amount,
            balanceBefore,
            balanceAfter,
            relatedId
        },
        ipAddress
    });
}

/**
 * Log user authentication
 */
export async function auditUserAuth({
    walletAddress,
    action,
    success,
    ipAddress = null,
    userAgent = null,
    details = null
}) {
    await logAudit({
        logType: AuditLogType.USER_AUTH,
        logLevel: success ? AuditLogLevel.INFO : AuditLogLevel.WARNING,
        walletAddress,
        action: `${action}: ${success ? 'success' : 'failed'}`,
        details,
        ipAddress,
        userAgent
    });
}

/**
 * Log admin action
 */
export async function auditAdminAction({
    adminUser,
    action,
    targetWallet = null,
    details = null,
    ipAddress = null
}) {
    await logAudit({
        logType: AuditLogType.ADMIN_ACTION,
        logLevel: AuditLogLevel.WARNING,
        walletAddress: targetWallet,
        adminUser,
        action,
        details,
        ipAddress
    });
}

/**
 * Log robot purchase
 */
export async function auditRobotPurchase({
    walletAddress,
    robotId,
    robotName,
    price,
    ipAddress = null
}) {
    await logAudit({
        logType: AuditLogType.ROBOT_PURCHASE,
        walletAddress,
        action: `Purchased robot: ${robotName} for ${price} USDT`,
        details: { robotId, robotName, price },
        ipAddress
    });
}

/**
 * Log withdrawal request
 */
export async function auditWithdrawal({
    walletAddress,
    amount,
    status,
    txHash = null,
    ipAddress = null
}) {
    await logAudit({
        logType: AuditLogType.WITHDRAWAL,
        logLevel: amount > 1000 ? AuditLogLevel.WARNING : AuditLogLevel.INFO,
        walletAddress,
        action: `Withdrawal of ${amount} USDT - ${status}`,
        details: { amount, status, txHash },
        ipAddress
    });
}

/**
 * Log security event
 */
export async function auditSecurityEvent({
    walletAddress = null,
    eventType,
    severity = 'medium',
    details = null,
    ipAddress = null
}) {
    await logAudit({
        logType: 'security_event',
        logLevel: severity === 'high' ? AuditLogLevel.CRITICAL : 
                  severity === 'medium' ? AuditLogLevel.WARNING : AuditLogLevel.INFO,
        walletAddress,
        action: `Security event: ${eventType}`,
        details: { eventType, severity, ...details },
        ipAddress
    });
}

/**
 * Log robot operation
 */
export async function auditRobotOperation({
    walletAddress,
    operation,
    robotId,
    robotName,
    amount = null,
    details = null,
    ipAddress = null
}) {
    await logAudit({
        logType: AuditLogType.ROBOT_PURCHASE,
        walletAddress,
        action: `Robot ${operation}: ${robotName}`,
        details: { robotId, robotName, operation, amount, ...details },
        ipAddress
    });
}

export default {
    AuditLogType,
    AuditLogLevel,
    setDbQuery,
    initAuditLogsTable,
    auditBalanceChange,
    auditUserAuth,
    auditAdminAction,
    auditRobotPurchase,
    auditWithdrawal
};

