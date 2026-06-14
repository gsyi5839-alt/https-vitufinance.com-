import path from 'path';
import {
    validateFilename,
    isAllowedExtension
} from './fileValidation.js';

function uploadProtectionMiddleware(req, res, next) {
    if (req.file) {
        const blockedResponse = getBlockedUploadResponse(req.file);
        if (blockedResponse) {
            return res.status(400).json(blockedResponse);
        }
    }

    if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        for (const file of files) {
            const blockedResponse = getBlockedUploadResponse(file);
            if (blockedResponse) {
                return res.status(400).json(blockedResponse);
            }
        }
    }

    next();
}

function getBlockedUploadResponse(file) {
    const validation = validateFilename(file.originalname);
    if (!validation.safe) {
        return {
            success: false,
            message: '文件名不合法',
            error: validation.error
        };
    }

    if (!isAllowedExtension(file.originalname)) {
        return {
            success: false,
            message: '不允许的文件类型',
            error: `Extension not allowed: ${path.extname(file.originalname)}`
        };
    }

    return null;
}

function pathTraversalProtectionMiddleware(req, res, next) {
    const pathsToCheck = [
        req.path,
        req.originalUrl,
        ...(req.query ? Object.values(req.query).filter((value) => typeof value === 'string') : []),
        ...(req.params ? Object.values(req.params).filter((value) => typeof value === 'string') : [])
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

export {
    uploadProtectionMiddleware,
    pathTraversalProtectionMiddleware
};
