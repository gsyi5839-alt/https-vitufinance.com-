import express from 'express';
import { getRobotList, hoursToDays } from '../config/robotConfig.js';

const router = express.Router();

router.get('/api/robot/configs', async (req, res) => {
    try {
        const allRobots = getRobotList();
        const configs = allRobots.map(robot => ({
            robot_name: robot.name,
            robot_id: robot.robot_id,
            robot_type: robot.robot_type,
            price: robot.price,
            min_price: robot.min_price,
            max_price: robot.max_price,
            duration_hours: robot.duration_hours,
            duration_days: hoursToDays(robot.duration_hours),
            quantify_interval_hours: robot.quantify_interval_hours,
            daily_profit: robot.daily_profit,
            total_return: robot.total_return || robot.total_return_rate,
            arbitrage_orders: robot.arbitrage_orders,
            limit: robot.limit,
            daily_limit: robot.daily_limit,
            return_principal: robot.return_principal,
            show_note: robot.show_note,
            locked: robot.locked,
            single_quantify: robot.single_quantify
        }));

        res.json({ success: true, data: configs, total: configs.length });
    } catch (error) {
        console.error('获取机器人配置失败:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch robot configs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

router.get('/api/robot/config', (req, res) => {
    const { type } = req.query;

    try {
        const robots = getRobotList(type || null);

        res.json({
            success: true,
            data: robots.map(robot => ({
                name: robot.name,
                robot_id: robot.robot_id,
                robot_type: robot.robot_type,
                duration_hours: robot.duration_hours,
                duration_days: hoursToDays(robot.duration_hours),
                quantify_interval_hours: robot.quantify_interval_hours,
                daily_profit: robot.daily_profit,
                arbitrage_orders: robot.arbitrage_orders,
                total_return: robot.total_return || robot.total_return_rate,
                limit: robot.limit,
                price: robot.price,
                min_price: robot.min_price,
                max_price: robot.max_price,
                return_principal: robot.return_principal,
                daily_limit: robot.daily_limit,
                single_quantify: robot.single_quantify,
                locked: robot.locked,
                show_note: robot.show_note
            }))
        });
    } catch (error) {
        console.error('获取机器人配置失败:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch robot config'
        });
    }
});

export default router;
