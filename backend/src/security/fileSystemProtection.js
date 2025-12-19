/**
 * File System Protection Module - Protect Critical System Files
 * 
 * Features:
 * - Monitor critical files and directories
 * - Detect unauthorized file modifications
 * - Alert on suspicious file operations
 * - Prevent directory traversal attacks
 * - Protect upload directories from malicious files
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database query function (set from server.js)
let dbQuery = null;

// ==================== Configuration ====================

const CONFIG = {
    // Check interval for file integrity
    CHECK_INTERVAL: 5 * 60 * 1000, // Every 5 minutes
    
    // Maximum file size for hash calculation (prevent DoS)
    MAX_FILE_SIZE_FOR_HASH: 10 * 1024 * 1024, // 10MB
    
    // Dangerous file extensions to block in uploads
    DANGEROUS_EXTENSIONS: [
        '.php', '.php3', '.php4', '.php5', '.phtml', '.phar',
        '.asp', '.aspx', '.ashx', '.asmx', '.cer',
        '.jsp', '.jspx', '.jsf', '.jsf2',
        '.sh', '.bash', '.zsh', '.csh', '.ksh',
        '.bat', '.cmd', '.ps1', '.vbs', '.wsf',
        '.exe', '.dll', '.so', '.dylib',
        '.cgi', '.pl', '.py', '.rb',
        '.htaccess', '.htpasswd', '.config'
    ],
    
    // Allowed upload extensions
    ALLOWED_EXTENSIONS: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.txt', '.csv', '.json'
    ],
    
    // Maximum filename length
    MAX_FILENAME_LENGTH: 255,
    
    // Patterns that indicate malicious content in files
    MALICIOUS_PATTERNS: [
        /<%.*%>/g,                      // JSP tags
        /<\?php/gi,                     // PHP opening tag
        /<script[^>]*>/gi,              // Script tags
        /eval\s*\(/gi,                  // eval function
        /exec\s*\(/gi,                  // exec function
        /system\s*\(/gi,                // system function
        /passthru\s*\(/gi,              // passthru function
        /shell_exec\s*\(/gi,            // shell_exec function
        /base64_decode\s*\(/gi,         // base64_decode function
        /\$_GET|\$_POST|\$_REQUEST/g,   // PHP superglobals
        /document\.cookie/gi,           // Cookie access
        /window\.location/gi            // Location manipulation
    ]
};

// Store for file hashes (for integrity monitoring)
const fileHashes = new Map();

// Store for file alerts
const fileAlerts = [];

// ==================== Initialization ====================

/**
 * Set database query function
 * @param {Function} queryFn - Database query function
 */
export function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

/**
 * Initialize file protection logs table
 */
export async function initFileProtectionTable() {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS file_protection_logs (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_hash VARCHAR(64),
                previous_hash VARCHAR(64),
                detected_issue TEXT,
                ip_address VARCHAR(45),
                user_agent VARCHAR(500),
                severity VARCHAR(20) NOT NULL DEFAULT 'medium',
                resolved TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_event_type (event_type),
                INDEX idx_file_path (file_path(255)),
                INDEX idx_severity (severity),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[FileProtection] file_protection_logs table initialized');
    } catch (error) {
        console.error('[FileProtection] Error initializing table:', error.message);
    }
}

// ==================== Path Security Functions ====================

/**
 * Validate and sanitize file path to prevent directory traversal
 * @param {string} inputPath - User-provided path
 * @param {string} basePath - Allowed base directory
 * @returns {object} - { safe: boolean, sanitizedPath: string, error: string }
 */
export function validatePath(inputPath, basePath) {
    if (!inputPath || typeof inputPath !== 'string') {
        return { safe: false, sanitizedPath: null, error: 'Invalid path' };
    }
    
    // Remove null bytes
    let cleanPath = inputPath.replace(/\x00/g, '');
    
    // Detect directory traversal attempts
    const traversalPatterns = [
        /\.\.\//g,           // ../
        /\.\.%2[fF]/g,       // ..%2f (URL encoded /)
        /\.\.%5[cC]/g,       // ..%5c (URL encoded \)
        /%2[eE]%2[eE]/g,     // %2e%2e (URL encoded ..)
        /\.\.\\/g,           // ..\
        /\.+\//g,            // multiple dots followed by /
        /\/\.\./g,           // /..
        /\\\.\./g            // \..
    ];
    
    for (const pattern of traversalPatterns) {
        if (pattern.test(cleanPath)) {
            return { 
                safe: false, 
                sanitizedPath: null, 
                error: 'Directory traversal attempt detected' 
            };
        }
    }
    
    // Resolve to absolute path
    const absolutePath = path.resolve(basePath, cleanPath);
    
    // Ensure the resolved path is within the base directory
    const normalizedBase = path.normalize(basePath);
    const normalizedPath = path.normalize(absolutePath);
    
    if (!normalizedPath.startsWith(normalizedBase)) {
        return { 
            safe: false, 
            sanitizedPath: null, 
            error: 'Path escapes allowed directory' 
        };
    }
    
    return { safe: true, sanitizedPath: normalizedPath, error: null };
}

/**
 * Check if filename is safe
 * @param {string} filename - Filename to check
 * @returns {object} - { safe: boolean, error: string }
 */
export function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return { safe: false, error: 'Invalid filename' };
    }
    
    // Check length
    if (filename.length > CONFIG.MAX_FILENAME_LENGTH) {
        return { safe: false, error: 'Filename too long' };
    }
    
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/g;
    if (dangerousChars.test(filename)) {
        return { safe: false, error: 'Filename contains dangerous characters' };
    }
    
    // Check for hidden files (starting with .)
    if (filename.startsWith('.')) {
        return { safe: false, error: 'Hidden files not allowed' };
    }
    
    // Check extension
    const ext = path.extname(filename).toLowerCase();
    if (CONFIG.DANGEROUS_EXTENSIONS.includes(ext)) {
        return { safe: false, error: `Dangerous file extension: ${ext}` };
    }
    
    return { safe: true, error: null };
}

/**
 * Check if file extension is allowed for upload
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if allowed
 */
export function isAllowedExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return CONFIG.ALLOWED_EXTENSIONS.includes(ext);
}

// ==================== File Content Security ====================

/**
 * Scan file content for malicious patterns
 * @param {Buffer|string} content - File content to scan
 * @returns {object} - { safe: boolean, patterns: string[] }
 */
export function scanFileContent(content) {
    const contentStr = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    const detectedPatterns = [];
    
    for (const pattern of CONFIG.MALICIOUS_PATTERNS) {
        const matches = contentStr.match(pattern);
        if (matches) {
            detectedPatterns.push({
                pattern: pattern.toString(),
                matches: matches.slice(0, 5) // Limit to first 5 matches
            });
        }
    }
    
    return {
        safe: detectedPatterns.length === 0,
        patterns: detectedPatterns
    };
}

/**
 * Validate uploaded file
 * @param {object} file - Multer file object
 * @returns {Promise<object>} - Validation result
 */
export async function validateUploadedFile(file) {
    const errors = [];
    
    // Check filename
    const filenameCheck = validateFilename(file.originalname);
    if (!filenameCheck.safe) {
        errors.push(filenameCheck.error);
    }
    
    // Check extension
    if (!isAllowedExtension(file.originalname)) {
        errors.push(`File type not allowed: ${path.extname(file.originalname)}`);
    }
    
    // Check MIME type matches extension
    const ext = path.extname(file.originalname).toLowerCase();
    const expectedMime = getMimeType(ext);
    if (expectedMime && !file.mimetype.startsWith(expectedMime.split('/')[0])) {
        errors.push(`MIME type mismatch: expected ${expectedMime}, got ${file.mimetype}`);
    }
    
    // Scan content if small enough
    if (file.buffer && file.size < 1024 * 1024) { // 1MB limit
        const contentScan = scanFileContent(file.buffer);
        if (!contentScan.safe) {
            errors.push('Malicious content detected in file');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get expected MIME type for extension
 * @param {string} ext - File extension
 * @returns {string|null} - Expected MIME type
 */
function getMimeType(ext) {
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.json': 'application/json'
    };
    return mimeTypes[ext] || null;
}

// ==================== File Integrity Monitoring ====================

/**
 * Calculate SHA-256 hash of file
 * @param {string} filePath - Path to file
 * @returns {Promise<string|null>} - File hash or null if error
 */
export async function calculateFileHash(filePath) {
    return new Promise((resolve) => {
        try {
            // Check file size first
            const stats = fs.statSync(filePath);
            if (stats.size > CONFIG.MAX_FILE_SIZE_FOR_HASH) {
                resolve(null);
                return;
            }
            
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', () => resolve(null));
        } catch (error) {
            resolve(null);
        }
    });
}

/**
 * Register files to monitor for integrity
 * @param {Array<string>} filePaths - Array of file paths to monitor
 */
export async function registerFilesForMonitoring(filePaths) {
    console.log(`[FileProtection] Registering ${filePaths.length} files for monitoring`);
    
    for (const filePath of filePaths) {
        try {
            if (fs.existsSync(filePath)) {
                const hash = await calculateFileHash(filePath);
                if (hash) {
                    fileHashes.set(filePath, {
                        hash,
                        registeredAt: Date.now(),
                        lastChecked: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error(`[FileProtection] Error registering file ${filePath}:`, error.message);
        }
    }
    
    console.log(`[FileProtection] Successfully registered ${fileHashes.size} files`);
}

/**
 * Check integrity of all registered files
 * @returns {Promise<Array>} - Array of modified files
 */
export async function checkFileIntegrity() {
    const modifiedFiles = [];
    const now = Date.now();
    
    for (const [filePath, fileInfo] of fileHashes.entries()) {
        try {
            if (!fs.existsSync(filePath)) {
                // File was deleted!
                modifiedFiles.push({
                    path: filePath,
                    type: 'deleted',
                    previousHash: fileInfo.hash,
                    currentHash: null
                });
                await logFileEvent('file_deleted', filePath, null, fileInfo.hash, 'critical');
                continue;
            }
            
            const currentHash = await calculateFileHash(filePath);
            
            if (currentHash && currentHash !== fileInfo.hash) {
                // File was modified!
                modifiedFiles.push({
                    path: filePath,
                    type: 'modified',
                    previousHash: fileInfo.hash,
                    currentHash
                });
                await logFileEvent('file_modified', filePath, currentHash, fileInfo.hash, 'high');
            }
            
            // Update last checked time
            fileInfo.lastChecked = now;
        } catch (error) {
            console.error(`[FileProtection] Error checking file ${filePath}:`, error.message);
        }
    }
    
    if (modifiedFiles.length > 0) {
        console.log(`\x1b[31m[FileProtection] WARNING: ${modifiedFiles.length} files modified!\x1b[0m`);
        for (const file of modifiedFiles) {
            console.log(`  - ${file.type.toUpperCase()}: ${file.path}`);
        }
    }
    
    return modifiedFiles;
}

/**
 * Log file protection event to database
 */
async function logFileEvent(eventType, filePath, hash, prevHash, severity, ip = null, ua = null) {
    if (!dbQuery) return;
    
    try {
        await dbQuery(`
            INSERT INTO file_protection_logs 
            (event_type, file_path, file_hash, previous_hash, severity, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [eventType, filePath, hash, prevHash, severity, ip, ua]);
    } catch (error) {
        console.error('[FileProtection] Error logging event:', error.message);
    }
    
    // Add to in-memory alerts
    fileAlerts.push({
        eventType,
        filePath,
        severity,
        timestamp: Date.now()
    });
    
    // Keep only last 100 alerts
    if (fileAlerts.length > 100) {
        fileAlerts.shift();
    }
}

/**
 * Get recent file protection alerts
 * @returns {Array} - Recent alerts
 */
export function getRecentAlerts() {
    return [...fileAlerts].reverse();
}

// ==================== Critical Files Registration ====================

/**
 * Register critical application files for monitoring
 * @param {string} projectRoot - Project root directory
 */
export async function registerCriticalFiles(projectRoot) {
    const criticalPaths = [
        // Backend core files
        path.join(projectRoot, 'backend', 'server.js'),
        path.join(projectRoot, 'backend', 'db.js'),
        path.join(projectRoot, 'backend', 'package.json'),
        
        // Security files
        path.join(projectRoot, 'backend', 'src', 'security', 'index.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'ipProtection.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'sqlInjectionGuard.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'attackLogger.js'),
        
        // Middleware files
        path.join(projectRoot, 'backend', 'src', 'middleware', 'security.js'),
        path.join(projectRoot, 'backend', 'src', 'middleware', 'csrf.js'),
        
        // Config files
        path.join(projectRoot, 'backend', 'src', 'config', 'tokenPrices.js'),
    ];
    
    // Filter existing files
    const existingFiles = criticalPaths.filter(p => fs.existsSync(p));
    
    await registerFilesForMonitoring(existingFiles);
}

// ==================== Upload Protection Middleware ====================

/**
 * Middleware to validate file uploads
 * Use after multer middleware
 */
export function uploadProtectionMiddleware(req, res, next) {
    // Check single file
    if (req.file) {
        const validation = validateFilename(req.file.originalname);
        if (!validation.safe) {
            return res.status(400).json({
                success: false,
                message: '文件名不合法',
                error: validation.error
            });
        }
        
        if (!isAllowedExtension(req.file.originalname)) {
            return res.status(400).json({
                success: false,
                message: '不允许的文件类型',
                error: `Extension not allowed: ${path.extname(req.file.originalname)}`
            });
        }
    }
    
    // Check multiple files
    if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        for (const file of files) {
            const validation = validateFilename(file.originalname);
            if (!validation.safe) {
                return res.status(400).json({
                    success: false,
                    message: '文件名不合法',
                    error: validation.error
                });
            }
            
            if (!isAllowedExtension(file.originalname)) {
                return res.status(400).json({
                    success: false,
                    message: '不允许的文件类型',
                    error: `Extension not allowed: ${path.extname(file.originalname)}`
                });
            }
        }
    }
    
    next();
}

/**
 * Middleware to prevent directory traversal in request paths
 */
export function pathTraversalProtectionMiddleware(req, res, next) {
    const pathsToCheck = [
        req.path,
        req.originalUrl,
        ...(req.query ? Object.values(req.query).filter(v => typeof v === 'string') : []),
        ...(req.params ? Object.values(req.params).filter(v => typeof v === 'string') : [])
    ];
    
    const traversalPatterns = [
        /\.\.\//,
        /\.\.%2[fF]/,
        /\.\.%5[cC]/,
        /%2[eE]%2[eE]/,
        /\.\.\\/
    ];
    
    for (const pathValue of pathsToCheck) {
        if (!pathValue) continue;
        
        for (const pattern of traversalPatterns) {
            if (pattern.test(pathValue)) {
                console.log(`[FileProtection] Directory traversal blocked: ${pathValue}`);
                return res.status(403).json({
                    success: false,
                    message: '非法请求路径',
                    error: 'Directory traversal attempt detected'
                });
            }
        }
    }
    
    next();
}

// ==================== Periodic Monitoring ====================

let monitoringInterval = null;

/**
 * Start file integrity monitoring
 */
export function startFileMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    monitoringInterval = setInterval(async () => {
        const modifiedFiles = await checkFileIntegrity();
        
        if (modifiedFiles.length > 0) {
            // You could add notification here (email, webhook, etc.)
            console.log(`[FileProtection] Integrity check complete: ${modifiedFiles.length} issues found`);
        }
    }, CONFIG.CHECK_INTERVAL);
    
    console.log(`[FileProtection] File monitoring started (interval: ${CONFIG.CHECK_INTERVAL / 1000}s)`);
}

/**
 * Stop file integrity monitoring
 */
export function stopFileMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('[FileProtection] File monitoring stopped');
    }
}

export default {
    setDbQuery,
    initFileProtectionTable,
    validatePath,
    validateFilename,
    isAllowedExtension,
    scanFileContent,
    validateUploadedFile,
    calculateFileHash,
    registerFilesForMonitoring,
    registerCriticalFiles,
    checkFileIntegrity,
    getRecentAlerts,
    uploadProtectionMiddleware,
    pathTraversalProtectionMiddleware,
    startFileMonitoring,
    stopFileMonitoring
};

