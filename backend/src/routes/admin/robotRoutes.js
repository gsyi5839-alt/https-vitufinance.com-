/**
 * Admin Routes - Robot Management
 */
import express from 'express';
import robotQueryRoutes from './robotQueryRoutes.js';
import robotActionRoutes from './robotActionRoutes.js';

const router = express.Router();

router.use(robotQueryRoutes);
router.use(robotActionRoutes);

export default router;
