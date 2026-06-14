/**
 * Robot expiry cron public API.
 *
 * Original import path is preserved while processing, reward distribution,
 * queries, and scheduling live in focused modules.
 */

import { setDbQuery } from './robotExpiryState.js';
import {
    processAllExpiredRobots,
    processExpiredRobot
} from './robotExpiryProcessor.js';
import {
    getUpcomingExpirations,
    getExpiryStats
} from './robotExpiryQueries.js';
import { startCronJob } from './robotExpiryScheduler.js';

export {
    setDbQuery,
    processAllExpiredRobots,
    processExpiredRobot,
    getUpcomingExpirations,
    getExpiryStats,
    startCronJob
};
