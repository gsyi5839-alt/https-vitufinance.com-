export function createRobotConfigApi({ SAFETY_LIMITS, ALL_ROBOTS }) {
    function getRobotConfig(robotName) {
        return ALL_ROBOTS[robotName] || null;
    }

    function calculateEndTime(robotName, startTime = new Date()) {
        const config = getRobotConfig(robotName);
        if (!config) {
            throw new Error(`Robot config not found: ${robotName}`);
        }

        const endTime = new Date(startTime.getTime());
        endTime.setTime(endTime.getTime() + config.duration_hours * 60 * 60 * 1000);
        return endTime;
    }

    function calculateQuantifyEarnings(robotName, price) {
        const config = getRobotConfig(robotName);
        if (!config) {
            throw new Error(`Robot config not found: ${robotName}`);
        }

        if (config.single_quantify) {
            return 0;
        }

        const effectiveDailyProfit = Math.min(
            config.daily_profit,
            SAFETY_LIMITS.MAX_DAILY_PROFIT_RATE
        );

        const intervalDays = config.quantify_interval_hours / 24;
        let earnings = price * (effectiveDailyProfit / 100) * intervalDays;

        if (earnings > SAFETY_LIMITS.MAX_SINGLE_EARNING) {
            console.warn(`[SAFETY] Earnings capped: ${robotName}, original=${earnings.toFixed(2)}, capped=${SAFETY_LIMITS.MAX_SINGLE_EARNING}`);
            earnings = SAFETY_LIMITS.MAX_SINGLE_EARNING;
        }

        if (earnings > SAFETY_LIMITS.EARNING_WARNING_THRESHOLD) {
            console.warn(`[WARNING] High earnings detected: ${robotName}, price=${price}, earnings=${earnings.toFixed(2)}`);
        }

        return parseFloat(earnings.toFixed(4));
    }

    function calculateHighRobotReturn(robotName, price) {
        const config = getRobotConfig(robotName);
        if (!config || config.robot_type !== 'high') {
            return price;
        }

        const effectiveDailyProfit = Math.min(
            config.daily_profit,
            SAFETY_LIMITS.MAX_DAILY_PROFIT_RATE
        );

        const days = config.duration_hours / 24;
        const totalProfitRate = (effectiveDailyProfit / 100) * days;
        let totalReturn = price * (1 + totalProfitRate);

        const maxProfit = price * 0.5;
        const actualProfit = totalReturn - price;
        if (actualProfit > maxProfit) {
            console.warn(`[SAFETY] High robot profit capped: ${robotName}, original profit=${actualProfit.toFixed(2)}, capped=${maxProfit.toFixed(2)}`);
            totalReturn = price + maxProfit;
        }

        return parseFloat(totalReturn.toFixed(4));
    }

    function checkQuantifyStatus(robot, currentTime = new Date()) {
        const config = getRobotConfig(robot.robot_name);
        if (!config) {
            return { canQuantify: false, reason: 'Robot config not found', nextQuantifyTime: null };
        }

        const endTime = new Date(robot.end_time);

        if (currentTime >= endTime) {
            return { canQuantify: false, reason: 'Robot has expired', nextQuantifyTime: null };
        }

        if (config.single_quantify) {
            if (robot.is_quantified === 1) {
                return { canQuantify: false, reason: 'This robot can only be quantified once, already completed', nextQuantifyTime: null };
            }
            return { canQuantify: true, reason: 'Can quantify', nextQuantifyTime: null };
        }

        if (robot.last_quantify_time) {
            const lastQuantifyTime = new Date(robot.last_quantify_time);
            const intervalMs = config.quantify_interval_hours * 60 * 60 * 1000;
            const nextQuantifyTime = new Date(lastQuantifyTime.getTime() + intervalMs);

            if (currentTime < nextQuantifyTime) {
                const hoursRemaining = (nextQuantifyTime - currentTime) / (1000 * 60 * 60);
                return {
                    canQuantify: false,
                    reason: `Need to wait ${Math.floor(hoursRemaining)} hours ${Math.floor((hoursRemaining % 1) * 60)} minutes for next quantification`,
                    nextQuantifyTime: nextQuantifyTime,
                    hoursRemaining: hoursRemaining
                };
            }
        }

        return { canQuantify: true, reason: 'Can quantify', nextQuantifyTime: null };
    }

    function isRobotExpired(robot, currentTime = new Date()) {
        const endTime = new Date(robot.end_time);
        return currentTime >= endTime;
    }

    function getRobotList(type = null) {
        const robots = Object.entries(ALL_ROBOTS).map(([name, config]) => ({
            name,
            ...config
        }));

        if (type) {
            return robots.filter(r => r.robot_type === type);
        }

        return robots;
    }

    function hoursToDays(hours) {
        return Math.floor(hours / 24);
    }

    function formatRemainingTime(endTime, currentTime = new Date()) {
        const remaining = endTime - currentTime;
        if (remaining <= 0) return 'Expired';

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }

        return `${hours}h ${minutes}m`;
    }

    return {
        getRobotConfig,
        calculateEndTime,
        calculateQuantifyEarnings,
        calculateHighRobotReturn,
        checkQuantifyStatus,
        isRobotExpired,
        getRobotList,
        hoursToDays,
        formatRemainingTime
    };
}
