import { processAllTeamDividends } from './teamDividendDaily.js';

let cronTimer = null;

function startTeamDividendCron(hour = 1, minute = 0) {
    console.log(`[TeamCron] 启动团队分红定时任务，执行时间: 每天 ${hour}:${String(minute).padStart(2, '0')}`);

    if (cronTimer) {
        clearTimeout(cronTimer);
    }

    function getNextRunTime() {
        const now = new Date();
        const next = new Date();
        next.setHours(hour, minute, 0, 0);

        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    }

    function scheduleNext() {
        const nextRun = getNextRunTime();
        const delay = nextRun.getTime() - Date.now();
        console.log(`[TeamCron] 下次执行时间: ${nextRun.toISOString()}`);

        cronTimer = setTimeout(async () => {
            await processAllTeamDividends();
            scheduleNext();
        }, delay);
    }

    scheduleNext();
}

function stopTeamDividendCron() {
    if (cronTimer) {
        clearTimeout(cronTimer);
        cronTimer = null;
        console.log('[TeamCron] 团队分红定时任务已停止');
    }
}

async function manualProcessDividends() {
    console.log('[TeamCron] 手动触发团队分红处理...');
    return await processAllTeamDividends();
}

export {
    startTeamDividendCron,
    stopTeamDividendCron,
    manualProcessDividends
};
