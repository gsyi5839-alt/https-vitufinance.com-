import { processAllExpiredRobots } from './robotExpiryProcessor.js';

function startCronJob(intervalMinutes = 60) {
    console.log(`[Cron] Starting robot expiry cron job, interval: ${intervalMinutes} minutes`);

    processAllExpiredRobots();

    const timer = setInterval(() => {
        processAllExpiredRobots();
    }, intervalMinutes * 60 * 1000);

    return {
        stop: () => {
            clearInterval(timer);
            console.log('[Cron] Robot expiry cron job stopped');
        }
    };
}

export {
    startCronJob
};
