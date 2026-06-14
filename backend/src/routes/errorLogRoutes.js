import express from 'express';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'critical'];

function normalizeLevel(level, fallback = 'error') {
    return LOG_LEVELS.includes(level) ? level : fallback;
}

function truncate(value, maxLength) {
    return value ? String(value).substring(0, maxLength) : null;
}

export function createErrorLogRoutes({ logError, ErrorLevel, ErrorSource }) {
    const router = express.Router();

    router.post('/error-log', async (req, res) => {
        try {
            const {
                level,
                type,
                message,
                stack,
                filePath,
                lineNumber,
                columnNumber,
                userAgent,
                url,
                walletAddress,
                additionalData
            } = req.body;

            const errorId = await logError({
                level: level || ErrorLevel.ERROR,
                source: ErrorSource.FRONTEND,
                type: type || 'FrontendError',
                message: message || 'Unknown frontend error',
                stack,
                requestUrl: url,
                userAgent: userAgent || req.headers['user-agent'],
                ipAddress: req.ip || req.connection?.remoteAddress,
                walletAddress,
                filePath,
                lineNumber,
                columnNumber,
                additionalData
            });

            res.json({
                success: true,
                message: 'Error logged',
                errorId
            });
        } catch (error) {
            console.error('记录前端错误失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to log error'
            });
        }
    });

    router.post('/log/error', async (req, res) => {
        try {
            const {
                level = 'error',
                source = 'frontend',
                message,
                stack,
                metadata,
                componentName,
                context,
                clientType = 'frontend'
            } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Error message is required'
                });
            }

            const sanitizedComponent = truncate(componentName, 100);
            const userWallet = context?.walletAddress || req.body.userWallet || null;
            const combinedMetadata = {
                ...metadata,
                context,
                clientType,
                componentName: sanitizedComponent,
                clientIp: req.ip,
                userAgent: req.headers['user-agent']?.substring(0, 200)
            };

            await logError({
                level: normalizeLevel(level),
                source: `${clientType}_${source}`,
                message: truncate(message, 2000),
                stack: truncate(stack, 5000),
                metadata: combinedMetadata,
                userWallet: userWallet ? String(userWallet).substring(0, 42) : null,
                requestPath: context?.url || null,
                requestMethod: 'CLIENT_ERROR'
            });

            res.json({
                success: true,
                message: 'Error logged successfully'
            });
        } catch (error) {
            console.error('[ErrorLog API] Failed to log error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to log error'
            });
        }
    });

    router.post('/admin/log/error', async (req, res) => {
        try {
            const {
                level = 'error',
                source = 'admin',
                message,
                stack,
                metadata,
                componentName,
                context
            } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Error message is required'
                });
            }

            const combinedMetadata = {
                ...metadata,
                context,
                componentName,
                clientType: 'admin',
                clientIp: req.ip,
                adminId: context?.adminId
            };

            await logError({
                level: normalizeLevel(level),
                source: `admin_${source}`,
                message: truncate(message, 2000),
                stack: truncate(stack, 5000),
                metadata: combinedMetadata,
                userWallet: null,
                requestPath: context?.url || null,
                requestMethod: 'ADMIN_CLIENT_ERROR'
            });

            res.json({
                success: true,
                message: 'Admin error logged successfully'
            });
        } catch (error) {
            console.error('[AdminErrorLog API] Failed to log error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to log error'
            });
        }
    });

    return router;
}
