/**
 * Proxy Subscription Routes
 */
import express from 'express';
import proxySubscriptionRoutes from './proxySubscriptionRoutes.js';
import { setDbQuery } from '../services/proxyDbContext.js';
import { initProxyTables } from '../services/proxySchemaService.js';

const router = express.Router();

router.use(proxySubscriptionRoutes);

export { router, setDbQuery, initProxyTables };
export default router;
