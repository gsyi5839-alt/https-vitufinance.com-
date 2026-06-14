import express from 'express';

export function createSystemRoutes({ dbHealthCheck, dbQuery }) {
    const router = express.Router();

    router.get('/', (req, res) => {
        res.json({
            success: true,
            message: 'VituFinance API Server',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        });
    });

    router.get('/api/health', (req, res) => {
        res.json({
            success: true,
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    });

    router.get('/api/db/health', async (req, res) => {
        try {
            const info = await dbHealthCheck();
            res.json({
                success: true,
                db: info?.db || null,
                alive: info?.alive === 1
            });
        } catch (error) {
            console.error('DB health check failed:', error.message);
            res.status(500).json({
                success: false,
                message: 'Database connection failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // SECURITY: /api/db/tables (SHOW TABLES) removed — it leaked the full DB schema
    // to unauthenticated callers. Schema introspection must never be publicly exposed.

    return router;
}
