import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CONFIG } from './fileProtectionConfig.js';

let dbQuery = null;
let monitoringInterval = null;

const fileHashes = new Map();
const fileAlerts = [];

function setDbQuery(queryFn) {
    dbQuery = queryFn;
}

async function initFileProtectionTable() {
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

async function calculateFileHash(filePath) {
    return new Promise((resolve) => {
        try {
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

async function registerFilesForMonitoring(filePaths) {
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

async function checkFileIntegrity() {
    const modifiedFiles = [];
    const now = Date.now();

    for (const [filePath, fileInfo] of fileHashes.entries()) {
        try {
            if (!fs.existsSync(filePath)) {
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
                modifiedFiles.push({
                    path: filePath,
                    type: 'modified',
                    previousHash: fileInfo.hash,
                    currentHash
                });
                await logFileEvent('file_modified', filePath, currentHash, fileInfo.hash, 'high');
            }

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

    fileAlerts.push({
        eventType,
        filePath,
        severity,
        timestamp: Date.now()
    });

    if (fileAlerts.length > 100) {
        fileAlerts.shift();
    }
}

function getRecentAlerts() {
    return [...fileAlerts].reverse();
}

async function registerCriticalFiles(projectRoot) {
    const criticalPaths = [
        path.join(projectRoot, 'backend', 'server.js'),
        path.join(projectRoot, 'backend', 'db.js'),
        path.join(projectRoot, 'backend', 'package.json'),
        path.join(projectRoot, 'backend', 'src', 'security', 'index.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'ipProtection.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'sqlInjectionGuard.js'),
        path.join(projectRoot, 'backend', 'src', 'security', 'attackLogger.js'),
        path.join(projectRoot, 'backend', 'src', 'middleware', 'security.js'),
        path.join(projectRoot, 'backend', 'src', 'middleware', 'csrf.js'),
        path.join(projectRoot, 'backend', 'src', 'config', 'tokenPrices.js')
    ];

    const existingFiles = criticalPaths.filter((filePath) => fs.existsSync(filePath));
    await registerFilesForMonitoring(existingFiles);
}

function startFileMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }

    monitoringInterval = setInterval(async () => {
        const modifiedFiles = await checkFileIntegrity();

        if (modifiedFiles.length > 0) {
            console.log(`[FileProtection] Integrity check complete: ${modifiedFiles.length} issues found`);
        }
    }, CONFIG.CHECK_INTERVAL);

    console.log(`[FileProtection] File monitoring started (interval: ${CONFIG.CHECK_INTERVAL / 1000}s)`);
}

function stopFileMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('[FileProtection] File monitoring stopped');
    }
}

export {
    setDbQuery,
    initFileProtectionTable,
    calculateFileHash,
    registerFilesForMonitoring,
    registerCriticalFiles,
    checkFileIntegrity,
    getRecentAlerts,
    startFileMonitoring,
    stopFileMonitoring
};
