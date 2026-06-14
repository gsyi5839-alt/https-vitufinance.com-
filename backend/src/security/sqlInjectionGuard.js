/**
 * SQL Injection Guard Module - Deep SQL Injection Prevention
 * 
 * Features:
 * - Multi-layer SQL injection detection
 * - Pattern-based attack detection
 * - Input sanitization and validation
 * - Query parameter validation
 * - Attack logging and alerting
 */
import {
    SQL_INJECTION_PATTERNS,
    HIGH_RISK_KEYWORDS,
    DANGEROUS_OPERATORS,
    isEthWalletAddress
} from './sqlInjectionPatterns.js';

// ==================== Detection Functions ====================

/**
 * Check if input contains SQL injection patterns
 * @param {string} input - Input string to check
 * @returns {object} - Detection result { isSqlInjection: boolean, patterns: string[], risk: string }
 */
export function detectSqlInjection(input) {
    if (!input || typeof input !== 'string') {
        return { isSqlInjection: false, patterns: [], risk: 'none' };
    }
    
    // 如果是有效的以太坊钱包地址，直接返回安全
    if (isEthWalletAddress(input)) {
        return { isSqlInjection: false, patterns: [], risk: 'none' };
    }
    
    const detectedPatterns = [];
    let riskLevel = 0;
    
    // Check against injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
        // 跳过 hex encoding 检测，因为钱包地址会被误报
        // 只有在不是钱包地址时才检测 0x 开头的内容
        if (pattern.toString().includes('0x') && input.toLowerCase().startsWith('0x')) {
            continue;
        }
        if (pattern.test(input)) {
            detectedPatterns.push(pattern.toString());
            riskLevel += 3;
        }
    }
    
    // Check for high-risk keywords
    const lowerInput = input.toLowerCase();
    for (const keyword of HIGH_RISK_KEYWORDS) {
        if (lowerInput.includes(keyword)) {
            // Check if it's in a suspicious context
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (regex.test(input)) {
                detectedPatterns.push(`High-risk keyword: ${keyword}`);
                riskLevel += 5;
            }
        }
    }
    
    // Check for multiple dangerous operators (likely injection attempt)
    let dangerousOperatorCount = 0;
    for (const op of DANGEROUS_OPERATORS) {
        const regex = new RegExp(`\\b${op}\\b`, 'i');
        if (regex.test(input)) {
            dangerousOperatorCount++;
        }
    }
    if (dangerousOperatorCount >= 2) {
        detectedPatterns.push(`Multiple SQL operators: ${dangerousOperatorCount}`);
        riskLevel += dangerousOperatorCount * 2;
    }
    
    // Determine risk level
    let risk = 'none';
    if (riskLevel >= 10) risk = 'critical';
    else if (riskLevel >= 5) risk = 'high';
    else if (riskLevel >= 2) risk = 'medium';
    else if (riskLevel >= 1) risk = 'low';
    
    return {
        isSqlInjection: detectedPatterns.length > 0,
        patterns: detectedPatterns,
        risk,
        riskScore: riskLevel
    };
}

/**
 * Scan entire request for SQL injection
 * @param {object} req - Express request object
 * @returns {object} - Scan result { hasInjection: boolean, details: object[] }
 */
export function scanRequest(req) {
    const details = [];
    
    // Scan query parameters
    if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
            const result = detectSqlInjection(String(value));
            if (result.isSqlInjection) {
                details.push({
                    location: 'query',
                    parameter: key,
                    value: String(value).substring(0, 100),
                    ...result
                });
            }
        }
    }
    
    // Scan body parameters
    if (req.body && typeof req.body === 'object') {
        scanObject(req.body, 'body', details);
    }
    
    // Scan URL parameters
    if (req.params) {
        for (const [key, value] of Object.entries(req.params)) {
            const result = detectSqlInjection(String(value));
            if (result.isSqlInjection) {
                details.push({
                    location: 'params',
                    parameter: key,
                    value: String(value).substring(0, 100),
                    ...result
                });
            }
        }
    }
    
    // Scan URL path - but only the query string part, not the path itself
    // API paths like /api/pledge/create or /api/robot/quantify are legitimate
    // We only want to detect SQL injection in query parameters
    const url = req.originalUrl || req.url || '';
    const queryStringIndex = url.indexOf('?');
    if (queryStringIndex > -1) {
        // Only check the query string portion
        const queryString = url.substring(queryStringIndex + 1);
        const urlResult = detectSqlInjection(queryString);
        // Only flag if it's high or critical risk (not just 'limit' or 'offset' params)
        if (urlResult.isSqlInjection && (urlResult.risk === 'high' || urlResult.risk === 'critical')) {
            details.push({
                location: 'url',
                parameter: 'query_string',
                value: queryString.substring(0, 100),
                ...urlResult
            });
        }
    }
    
    // Scan headers (some attacks come through headers)
    const headersToCheck = ['referer', 'user-agent', 'cookie', 'x-forwarded-for'];
    for (const header of headersToCheck) {
        if (req.headers[header]) {
            const result = detectSqlInjection(req.headers[header]);
            if (result.isSqlInjection && result.risk !== 'low') {
                details.push({
                    location: 'header',
                    parameter: header,
                    value: String(req.headers[header]).substring(0, 100),
                    ...result
                });
            }
        }
    }
    
    return {
        hasInjection: details.length > 0,
        details,
        highestRisk: details.reduce((max, d) => 
            d.riskScore > (max?.riskScore || 0) ? d : max, null)?.risk || 'none'
    };
}

/**
 * Recursively scan object for SQL injection
 * @param {object} obj - Object to scan
 * @param {string} path - Current path in object
 * @param {Array} details - Array to store detection results
 */
function scanObject(obj, path, details) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = `${path}.${key}`;
        
        if (typeof value === 'string') {
            const result = detectSqlInjection(value);
            if (result.isSqlInjection) {
                details.push({
                    location: path,
                    parameter: key,
                    value: value.substring(0, 100),
                    ...result
                });
            }
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string') {
                    const result = detectSqlInjection(item);
                    if (result.isSqlInjection) {
                        details.push({
                            location: path,
                            parameter: `${key}[${index}]`,
                            value: item.substring(0, 100),
                            ...result
                        });
                    }
                } else if (typeof item === 'object') {
                    scanObject(item, `${currentPath}[${index}]`, details);
                }
            });
        } else if (typeof value === 'object') {
            scanObject(value, currentPath, details);
        }
    }
}

// ==================== Sanitization Functions ====================

/**
 * Sanitize input to remove SQL injection attempts
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeSqlInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    let sanitized = input;
    
    // Remove SQL comments
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/#.*$/gm, '');
    
    // Escape single quotes
    sanitized = sanitized.replace(/'/g, "''");
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Remove common injection patterns
    sanitized = sanitized.replace(/union\s+select/gi, '');
    sanitized = sanitized.replace(/;\s*(select|insert|update|delete|drop|create|alter)/gi, '');
    
    return sanitized.trim();
}

/**
 * Validate SQL identifier (table name, column name)
 * @param {string} identifier - Identifier to validate
 * @returns {boolean} - True if valid
 */
export function isValidIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return false;
    
    // Only allow alphanumeric and underscore, must start with letter or underscore
    const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return identifierRegex.test(identifier) && identifier.length <= 64;
}

/**
 * Validate and sanitize pagination parameters
 * @param {any} page - Page number
 * @param {any} pageSize - Page size
 * @returns {object} - Safe pagination parameters
 */
export function safePagination(page, pageSize) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    return { page: safePage, pageSize: safePageSize, offset: (safePage - 1) * safePageSize };
}

/**
 * Validate order by parameter
 * @param {string} orderBy - Order by value
 * @param {Array} allowedColumns - List of allowed column names
 * @returns {string|null} - Safe order by value or null if invalid
 */
export function safeOrderBy(orderBy, allowedColumns = []) {
    if (!orderBy || typeof orderBy !== 'string') return null;
    
    // Parse order by: "column ASC" or "column DESC"
    const match = orderBy.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(ASC|DESC)?$/i);
    if (!match) return null;
    
    const column = match[1].toLowerCase();
    const direction = (match[2] || 'ASC').toUpperCase();
    
    // Check if column is allowed
    if (allowedColumns.length > 0 && !allowedColumns.includes(column)) {
        return null;
    }
    
    return `${column} ${direction}`;
}

// ==================== Middleware ====================

/**
 * SQL Injection Guard Middleware
 * Blocks requests with detected SQL injection attempts
 */
export function sqlInjectionGuardMiddleware(req, res, next) {
    const scanResult = scanRequest(req);
    
    if (scanResult.hasInjection) {
        // Get client IP
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        
        // Log the attack
        console.error(`[SQLInjectionGuard] ATTACK DETECTED from IP: ${ip}`);
        console.error(`[SQLInjectionGuard] Path: ${req.method} ${req.originalUrl}`);
        console.error(`[SQLInjectionGuard] Details:`, JSON.stringify(scanResult.details, null, 2));
        
        // Determine response based on risk level
        if (scanResult.highestRisk === 'critical' || scanResult.highestRisk === 'high') {
            return res.status(403).json({
                success: false,
                message: '请求包含非法字符，已被拦截',
                error: 'Request contains malicious content and has been blocked'
            });
        }
        
        // For medium/low risk, sanitize and continue (optional)
        // But for safety, we block all detected injections
        return res.status(400).json({
            success: false,
            message: '请求参数格式不正确',
            error: 'Invalid request parameters'
        });
    }
    
    next();
}

/**
 * Create parameterized query builder
 * Ensures all user input is properly parameterized
 * @param {string} baseQuery - Base SQL query with ? placeholders
 * @param {Array} params - Parameters to bind
 * @returns {object} - Query object { sql: string, params: Array }
 */
export function buildSafeQuery(baseQuery, params = []) {
    // Validate that all params are safe types
    const safeParams = params.map(param => {
        if (param === null || param === undefined) return null;
        if (typeof param === 'number') return param;
        if (typeof param === 'boolean') return param ? 1 : 0;
        if (typeof param === 'string') {
            // Check for injection
            const result = detectSqlInjection(param);
            if (result.isSqlInjection && result.risk !== 'low') {
                console.warn(`[SQLInjectionGuard] Suspicious parameter blocked: ${param.substring(0, 50)}`);
                throw new Error('Invalid parameter detected');
            }
            return param;
        }
        if (param instanceof Date) return param;
        // For other types, convert to string and validate
        return String(param);
    });
    
    return { sql: baseQuery, params: safeParams };
}

export default {
    detectSqlInjection,
    scanRequest,
    sanitizeSqlInput,
    isValidIdentifier,
    safePagination,
    safeOrderBy,
    sqlInjectionGuardMiddleware,
    buildSafeQuery
};
