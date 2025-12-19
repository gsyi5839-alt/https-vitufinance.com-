/**
 * ============================================================================
 * 机器人统一配置文件
 * ============================================================================
 * 
 * 重要说明：
 * - 所有时间相关字段使用小时（hours）为单位
 * - duration_hours: 机器人运行周期（小时）
 * - quantify_interval_hours: 量化间隔（小时），null 表示只能量化一次
 * - daily_profit: 日收益率（%），用于计算每次量化收益
 * - total_return_rate: 到期总收益率（%），用于显示
 * 
 * 收益计算公式：
 * - 每次量化收益 = price × (daily_profit / 100) × (quantify_interval_hours / 24)
 * - 到期总收益（High）= price × (daily_profit / 100) × (duration_hours / 24)
 * 
 * 机器人类型说明：
 * - cex: CEX 机器人（Robot 页面），每天量化返利，到期返还本金
 * - dex: DEX 机器人（Robot 页面），每天量化返利，到期返还本金
 * - grid: Grid 机器人（Follow 页面），每天量化返利，到期返还本金
 * - high: High 机器人（Follow 页面），只量化一次，到期返还本金+利息
 */

// ============================================================================
// CEX 机器人配置（Robot 页面）
// ============================================================================
const CEX_ROBOTS = {
    'Binance Ai Bot': {
        robot_id: 'binance_01',
        robot_type: 'cex',
        duration_hours: 24,           // 1天 = 24小时
        quantify_interval_hours: 24,  // 每24小时量化一次
        daily_profit: 2.0,            // 日收益率 2.0%
        arbitrage_orders: 5,          // 套利订单数
        total_return: 20.4,           // 到期总收益（显示用）
        limit: 1,                     // 限购数量
        price: 20,                    // 固定价格
        return_principal: true        // 到期是否返还本金
    },
    'Coinbase Ai Bot': {
        robot_id: 'coinbase_01',
        robot_type: 'cex',
        duration_hours: 72,           // 3天 = 72小时
        quantify_interval_hours: 24,
        daily_profit: 2.0,
        arbitrage_orders: 8,
        total_return: 106,
        limit: 1,
        price: 100,
        return_principal: true
    },
    'OKX Ai Bot': {
        robot_id: 'okx_01',
        robot_type: 'cex',
        duration_hours: 48,           // 2天 = 48小时
        quantify_interval_hours: 24,
        daily_profit: 2.0,
        arbitrage_orders: 12,
        total_return: 312,
        limit: 1,
        price: 300,
        return_principal: true
    },
    'Bybit Ai Bot': {
        robot_id: 'bybit_01',
        robot_type: 'cex',
        duration_hours: 168,          // 7天 = 168小时
        quantify_interval_hours: 24,
        daily_profit: 1.5,
        arbitrage_orders: 15,
        total_return: 884,
        limit: 2,
        price: 800,
        return_principal: true
    },
    'Upbit Ai Bot': {
        robot_id: 'upbit_01',
        robot_type: 'cex',
        duration_hours: 360,          // 15天 = 360小时
        quantify_interval_hours: 24,
        daily_profit: 1.8,
        arbitrage_orders: 18,
        total_return: 2032,
        limit: 2,
        price: 1600,
        return_principal: true
    },
    'Bitfinex Ai Bot': {
        robot_id: 'bitfinex_01',
        robot_type: 'cex',
        duration_hours: 720,          // 30天 = 720小时
        quantify_interval_hours: 24,
        daily_profit: 2.0,
        arbitrage_orders: 25,
        total_return: 5120,
        limit: 2,
        price: 3200,
        return_principal: true
    },
    'Kucoin Ai Bot': {
        robot_id: 'kucoin_01',
        robot_type: 'cex',
        duration_hours: 1080,         // 45天 = 1080小时
        quantify_interval_hours: 24,
        daily_profit: 2.2,
        arbitrage_orders: 30,
        total_return: 13532,
        limit: 2,
        price: 6800,
        return_principal: true
    },
    'Bitget Ai Bot': {
        robot_id: 'bitget_01',
        robot_type: 'cex',
        duration_hours: 2160,         // 90天 = 2160小时
        quantify_interval_hours: 24,
        daily_profit: 2.5,
        arbitrage_orders: 45,
        total_return: 32500,
        limit: 2,
        price: 10000,
        return_principal: true
    },
    'Gate Ai Bot': {
        robot_id: 'gate_01',
        robot_type: 'cex',
        duration_hours: 2880,         // 120天 = 2880小时
        quantify_interval_hours: 24,
        daily_profit: 3.0,
        arbitrage_orders: 50,
        total_return: 92000,
        limit: 2,
        price: 20000,
        return_principal: true
    },
    'Binance Ai Bot-01': {
        robot_id: 'binance_02',
        robot_type: 'cex',
        duration_hours: 4320,         // 180天 = 4320小时
        quantify_interval_hours: 24,
        daily_profit: 4.2,
        arbitrage_orders: 60,
        total_return: 400608,
        limit: 2,
        price: 46800,
        return_principal: true
    }
};

// ============================================================================
// DEX 机器人配置（Robot 页面）
// ============================================================================
const DEX_ROBOTS = {
    'PancakeSwap Ai Bot': {
        robot_id: 'pancake_01',
        robot_type: 'dex',
        duration_hours: 720,          // 30天 = 720小时
        quantify_interval_hours: 24,
        daily_profit: 1.8,
        arbitrage_orders: 6,
        total_return: 1540,
        limit: 1,
        price: 1000,
        return_principal: true,
        show_note: true               // 显示本金返还说明
    },
    'Uniswap Ai Bot': {
        robot_id: 'uniswap_01',
        robot_type: 'dex',
        duration_hours: 720,
        quantify_interval_hours: 24,
        daily_profit: 2.0,
        arbitrage_orders: 10,
        total_return: 3200,
        limit: 1,
        price: 2000,
        return_principal: true,
        show_note: true
    },
    'BaseSwap Ai Bot': {
        robot_id: 'baseswap_01',
        robot_type: 'dex',
        duration_hours: 720,
        quantify_interval_hours: 24,
        daily_profit: 2.2,
        arbitrage_orders: 15,
        total_return: 4980,
        limit: 1,
        price: 3000,
        return_principal: true,
        show_note: true
    },
    'SushiSwap Ai Bot': {
        robot_id: 'sushiswap_01',
        robot_type: 'dex',
        duration_hours: 1440,         // 60天 = 1440小时
        quantify_interval_hours: 24,
        daily_profit: 2.5,
        arbitrage_orders: 20,
        total_return: 12500,
        limit: 1,
        price: 5000,
        return_principal: true,
        show_note: true
    },
    'Jupiter Ai Bot': {
        robot_id: 'jupiter_01',
        robot_type: 'dex',
        duration_hours: 1440,
        quantify_interval_hours: 24,
        daily_profit: 2.8,
        arbitrage_orders: 30,
        total_return: 26800,
        limit: 1,
        price: 10000,
        return_principal: true,
        show_note: true
    },
    'Curve Ai Bot': {
        robot_id: 'curve_01',
        robot_type: 'dex',
        duration_hours: 720,
        quantify_interval_hours: 24,
        daily_profit: 3.5,
        arbitrage_orders: 50,
        total_return: 61500,
        limit: 1,
        price: 30000,
        return_principal: true,
        show_note: true,
        locked: true                  // 锁定状态
    },
    'DODO Ai Bot': {
        robot_id: 'dodo_01',
        robot_type: 'dex',
        duration_hours: 720,
        quantify_interval_hours: 24,
        daily_profit: 4.0,
        arbitrage_orders: 60,
        total_return: 132000,
        limit: 1,
        price: 60000,
        return_principal: true,
        show_note: true,
        locked: true
    }
};

// ============================================================================
// Grid 机器人配置（Follow 页面）
// ============================================================================
const GRID_ROBOTS = {
    'Binance Grid Bot-M1': {
        robot_id: 'grid_m1',
        robot_type: 'grid',
        duration_hours: 2880,         // 120天 = 2880小时
        quantify_interval_hours: 24,
        daily_profit: 1.5,
        arbitrage_orders: 6,
        total_return: 1224,           // 680 × 1.5% × 120
        limit: 1,                     // 每天限购1个
        price: 680,
        return_principal: true,
        daily_limit: true             // 每日限购
    },
    'Binance Grid Bot-M2': {
        robot_id: 'grid_m2',
        robot_type: 'grid',
        duration_hours: 3600,         // 150天 = 3600小时
        quantify_interval_hours: 24,
        daily_profit: 1.6,
        arbitrage_orders: 15,
        total_return: 3792,           // 1580 × 1.6% × 150
        limit: 1,
        price: 1580,
        return_principal: true,
        daily_limit: true
    },
    'Binance Grid Bot-M3': {
        robot_id: 'grid_m3',
        robot_type: 'grid',
        duration_hours: 4320,         // 180天 = 4320小时
        quantify_interval_hours: 24,
        daily_profit: 1.7,
        arbitrage_orders: 28,
        total_return: 8812.8,         // 2880 × 1.7% × 180
        limit: 1,
        price: 2880,
        return_principal: true,
        daily_limit: true
    },
    'Binance Grid Bot-M4': {
        robot_id: 'grid_m4',
        robot_type: 'grid',
        duration_hours: 5040,         // 210天 = 5040小时
        quantify_interval_hours: 24,
        daily_profit: 1.8,
        arbitrage_orders: 50,
        total_return: 22226.4,        // 5880 × 1.8% × 210
        limit: 1,
        price: 5880,
        return_principal: true,
        daily_limit: true
    },
    'Binance Grid Bot-M5': {
        robot_id: 'grid_m5',
        robot_type: 'grid',
        duration_hours: 5760,         // 240天 = 5760小时
        quantify_interval_hours: 24,
        daily_profit: 2.0,
        arbitrage_orders: 60,
        total_return: 61440,          // 12800 × 2.0% × 240
        limit: 1,
        price: 12800,
        return_principal: true,
        daily_limit: true
    }
};

// ============================================================================
// High 机器人配置（Follow 页面）
// ============================================================================
const HIGH_ROBOTS = {
    'Binance High Robot-H1': {
        robot_id: 'high_h1',
        robot_type: 'high',
        duration_hours: 24,           // 1天 = 24小时
        quantify_interval_hours: null, // null 表示只能量化一次
        daily_profit: 1.2,
        arbitrage_orders: 5,
        total_return_rate: 1.2,       // 到期总收益率 1.2%
        limit: 1,
        min_price: 20,                // High 机器人有价格范围
        max_price: 80000,
        return_principal: true,
        daily_limit: true,
        single_quantify: true         // 只能量化一次
    },
    'Binance High Robot-H2': {
        robot_id: 'high_h2',
        robot_type: 'high',
        duration_hours: 72,           // 3天 = 72小时
        quantify_interval_hours: null,
        daily_profit: 1.3,
        arbitrage_orders: 8,
        total_return_rate: 3.9,       // 1.3% × 3 = 3.9%
        limit: 1,
        min_price: 100,
        max_price: 100000,
        return_principal: true,
        daily_limit: true,
        single_quantify: true
    },
    'Binance High Robot-H3': {
        robot_id: 'high_h3',
        robot_type: 'high',
        duration_hours: 120,          // 5天 = 120小时
        quantify_interval_hours: null,
        daily_profit: 1.4,
        arbitrage_orders: 12,
        total_return_rate: 7.0,       // 1.4% × 5 = 7.0%
        limit: 1,
        min_price: 200,
        max_price: 150000,
        return_principal: true,
        daily_limit: true,
        single_quantify: true
    }
};

// ============================================================================
// 合并所有机器人配置
// ============================================================================
const ALL_ROBOTS = {
    ...CEX_ROBOTS,
    ...DEX_ROBOTS,
    ...GRID_ROBOTS,
    ...HIGH_ROBOTS
};

/**
 * 获取机器人配置
 * @param {string} robotName - 机器人名称
 * @returns {object|null} 机器人配置，未找到返回 null
 */
function getRobotConfig(robotName) {
    return ALL_ROBOTS[robotName] || null;
}

/**
 * 计算机器人到期时间
 * @param {string} robotName - 机器人名称
 * @param {Date} startTime - 开始时间（默认当前时间）
 * @returns {Date} 到期时间
 */
function calculateEndTime(robotName, startTime = new Date()) {
    const config = getRobotConfig(robotName);
    if (!config) {
        throw new Error(`Robot config not found: ${robotName}`);
    }
    
    const endTime = new Date(startTime.getTime());
    endTime.setTime(endTime.getTime() + config.duration_hours * 60 * 60 * 1000);
    return endTime;
}

/**
 * 计算每次量化收益
 * @param {string} robotName - 机器人名称
 * @param {number} price - 投入金额
 * @returns {number} 量化收益
 */
function calculateQuantifyEarnings(robotName, price) {
    const config = getRobotConfig(robotName);
    if (!config) {
        throw new Error(`Robot config not found: ${robotName}`);
    }
    
    // High 机器人不按次计算收益
    if (config.single_quantify) {
        return 0;
    }
    
    // 每次量化收益 = 价格 × 日收益率 × (量化间隔/24)
    const intervalDays = config.quantify_interval_hours / 24;
    return price * (config.daily_profit / 100) * intervalDays;
}

/**
 * 计算 High 机器人到期总返还
 * @param {string} robotName - 机器人名称
 * @param {number} price - 投入金额
 * @returns {number} 到期返还金额（本金+利息）
 */
function calculateHighRobotReturn(robotName, price) {
    const config = getRobotConfig(robotName);
    if (!config || config.robot_type !== 'high') {
        return price; // 非 High 机器人只返还本金
    }
    
    // 总收益 = 本金 × 日收益率 × 天数
    const days = config.duration_hours / 24;
    const totalProfitRate = (config.daily_profit / 100) * days;
    return price * (1 + totalProfitRate);
}

/**
 * 检查是否可以量化
 * @param {object} robot - 机器人购买记录（从数据库获取）
 * @param {Date} currentTime - 当前时间（默认当前时间）
 * @returns {object} { canQuantify: boolean, reason: string, nextQuantifyTime: Date|null }
 */
function checkQuantifyStatus(robot, currentTime = new Date()) {
    const config = getRobotConfig(robot.robot_name);
    if (!config) {
        return { canQuantify: false, reason: '机器人配置不存在', nextQuantifyTime: null };
    }
    
    const endTime = new Date(robot.end_time);
    
    // 检查是否已到期
    if (currentTime >= endTime) {
        return { canQuantify: false, reason: '机器人已到期', nextQuantifyTime: null };
    }
    
    // High 机器人：只能量化一次
    if (config.single_quantify) {
        if (robot.is_quantified === 1) {
            return { canQuantify: false, reason: '该机器人只能量化一次，已完成量化', nextQuantifyTime: null };
        }
        return { canQuantify: true, reason: '可以量化', nextQuantifyTime: null };
    }
    
    // 其他机器人：检查量化间隔
    if (robot.last_quantify_time) {
        const lastQuantifyTime = new Date(robot.last_quantify_time);
        const intervalMs = config.quantify_interval_hours * 60 * 60 * 1000;
        const nextQuantifyTime = new Date(lastQuantifyTime.getTime() + intervalMs);
        
        if (currentTime < nextQuantifyTime) {
            const hoursRemaining = (nextQuantifyTime - currentTime) / (1000 * 60 * 60);
            return {
                canQuantify: false,
                reason: `距离下次量化还需等待 ${Math.floor(hoursRemaining)} 小时 ${Math.floor((hoursRemaining % 1) * 60)} 分钟`,
                nextQuantifyTime: nextQuantifyTime,
                hoursRemaining: hoursRemaining
            };
        }
    }
    
    return { canQuantify: true, reason: '可以量化', nextQuantifyTime: null };
}

/**
 * 检查机器人是否已到期
 * @param {object} robot - 机器人购买记录
 * @param {Date} currentTime - 当前时间
 * @returns {boolean} 是否已到期
 */
function isRobotExpired(robot, currentTime = new Date()) {
    const endTime = new Date(robot.end_time);
    return currentTime >= endTime;
}

/**
 * 获取所有机器人配置列表
 * @param {string} type - 机器人类型（可选：cex, dex, grid, high）
 * @returns {array} 机器人配置列表
 */
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

/**
 * 获取显示用的天数（兼容前端显示）
 * @param {number} hours - 小时数
 * @returns {number} 天数
 */
function hoursToDays(hours) {
    return Math.floor(hours / 24);
}

/**
 * 格式化剩余时间
 * @param {Date} endTime - 结束时间
 * @param {Date} currentTime - 当前时间
 * @returns {string} 格式化的剩余时间
 */
function formatRemainingTime(endTime, currentTime = new Date()) {
    const remaining = endTime - currentTime;
    if (remaining <= 0) return '已到期';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}天 ${remainingHours}小时`;
    }
    
    return `${hours}小时 ${minutes}分钟`;
}

// 导出模块（ES Module 语法）
export {
    // 配置数据
    CEX_ROBOTS,
    DEX_ROBOTS,
    GRID_ROBOTS,
    HIGH_ROBOTS,
    ALL_ROBOTS,
    
    // 函数
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

