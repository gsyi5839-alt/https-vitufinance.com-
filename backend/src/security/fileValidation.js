import path from 'path';
import { CONFIG } from './fileProtectionConfig.js';

function validatePath(inputPath, basePath) {
    if (!inputPath || typeof inputPath !== 'string') {
        return { safe: false, sanitizedPath: null, error: 'Invalid path' };
    }

    const cleanPath = inputPath.replace(/\x00/g, '');
    const traversalPatterns = [
        /\.\.\//g,
        /\.\.%2[fF]/g,
        /\.\.%5[cC]/g,
        /%2[eE]%2[eE]/g,
        /\.\.\\/g,
        /\.+\//g,
        /\/\.\./g,
        /\\\.\./g
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

    const absolutePath = path.resolve(basePath, cleanPath);
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

function validateFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return { safe: false, error: 'Invalid filename' };
    }

    if (filename.length > CONFIG.MAX_FILENAME_LENGTH) {
        return { safe: false, error: 'Filename too long' };
    }

    const dangerousChars = /[<>:"|?*\x00-\x1f]/g;
    if (dangerousChars.test(filename)) {
        return { safe: false, error: 'Filename contains dangerous characters' };
    }

    if (filename.startsWith('.')) {
        return { safe: false, error: 'Hidden files not allowed' };
    }

    const ext = path.extname(filename).toLowerCase();
    if (CONFIG.DANGEROUS_EXTENSIONS.includes(ext)) {
        return { safe: false, error: `Dangerous file extension: ${ext}` };
    }

    return { safe: true, error: null };
}

function isAllowedExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return CONFIG.ALLOWED_EXTENSIONS.includes(ext);
}

function scanFileContent(content) {
    const contentStr = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    const detectedPatterns = [];

    for (const pattern of CONFIG.MALICIOUS_PATTERNS) {
        const matches = contentStr.match(pattern);
        if (matches) {
            detectedPatterns.push({
                pattern: pattern.toString(),
                matches: matches.slice(0, 5)
            });
        }
    }

    return {
        safe: detectedPatterns.length === 0,
        patterns: detectedPatterns
    };
}

async function validateUploadedFile(file) {
    const errors = [];
    const filenameCheck = validateFilename(file.originalname);

    if (!filenameCheck.safe) {
        errors.push(filenameCheck.error);
    }

    if (!isAllowedExtension(file.originalname)) {
        errors.push(`File type not allowed: ${path.extname(file.originalname)}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const expectedMime = getMimeType(ext);
    if (expectedMime && !file.mimetype.startsWith(expectedMime.split('/')[0])) {
        errors.push(`MIME type mismatch: expected ${expectedMime}, got ${file.mimetype}`);
    }

    if (file.buffer && file.size < 1024 * 1024) {
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

export {
    validatePath,
    validateFilename,
    isAllowedExtension,
    scanFileContent,
    validateUploadedFile
};
