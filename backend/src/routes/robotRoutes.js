/**
 * 机器人路由组合入口。
 *
 * 具体实现拆分到：
 * - robotConfigRoutes.js
 * - robotPurchaseRoutes.js
 * - robotQuantifyRoutes.js
 * - robotListRoutes.js
 * - services/robotExpiryService.js
 */
import express from 'express';
import robotConfigRoutes from './robotConfigRoutes.js';
import robotPurchaseRoutes from './robotPurchaseRoutes.js';
import robotQuantifyRoutes from './robotQuantifyRoutes.js';
import robotListRoutes from './robotListRoutes.js';
import { setDbQuery } from '../services/robotContext.js';
import {
    processExpiredRobots,
    processAllExpiredRobots
} from '../services/robotExpiryService.js';

const router = express.Router();

router.use(robotConfigRoutes);
router.use(robotPurchaseRoutes);
router.use(robotQuantifyRoutes);
router.use(robotListRoutes);

export {
    router,
    setDbQuery,
    processExpiredRobots,
    processAllExpiredRobots
};
