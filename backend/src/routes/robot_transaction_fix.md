# 机器人购买事务保护修复指南

## 问题分析

当前`robotRoutes.js`中的购买流程（第309-312行和318-339行）：
```javascript
// 11. 扣除用户余额
await dbQuery(
    'UPDATE user_balances SET usdt_balance = usdt_balance - ?, updated_at = NOW() WHERE wallet_address = ?',
    [robotPrice, walletAddr]
);

// 12. 插入购买记录
const purchaseResult = await dbQuery(...);
```

**问题**: 如果步骤12失败，步骤11已经扣款，导致余额减少但没有机器人。

---

## 修复方案

### 方法1: 简单修复 - 添加余额检查到UPDATE语句

**优点**: 最简单，无需修改太多代码  
**缺点**: 仍不是完全原子操作

修改第309-312行：
```javascript
// 11. 扣除用户余额（带余额检查的原子操作）
const deductResult = await dbQuery(
    `UPDATE user_balances 
     SET usdt_balance = usdt_balance - ?, 
         updated_at = NOW() 
     WHERE wallet_address = ? 
     AND usdt_balance >= ?`,  // ← 添加余额检查
    [robotPrice, walletAddr, robotPrice]
);

// 检查是否成功扣款
if (deductResult.affectedRows === 0) {
    return res.status(400).json({
        success: false,
        message: 'Insufficient balance or concurrent transaction detected'
    });
}
```

---

### 方法2: 完整修复 - 使用数据库事务（推荐）

**优点**: 完全原子操作，最安全  
**缺点**: 需要导入pool并修改较多代码

#### 步骤1: 在文件顶部添加pool导入

在第19行后添加：
```javascript
import express from 'express';
const router = express.Router();

// ← 添加这行
import pool from '../../db.js';  // 导入数据库连接池
```

#### 步骤2: 修改购买接口（第175行开始）

将整个购买流程包裹在事务中：

```javascript
router.post('/api/robot/purchase', sensitiveLimiter, async (req, res) => {
    const connection = await pool.getConnection();  // ← 获取连接
    
    try {
        const { wallet_address, robot_name, price } = req.body;
        
        // 1-10. 参数验证、配置获取等（保持不变）
        // ... 所有验证逻辑 ...
        
        // ===== 开启事务 =====
        await connection.beginTransaction();
        
        // 11. 扣除用户余额（使用connection执行）
        const [deductResult] = await connection.execute(
            `UPDATE user_balances 
             SET usdt_balance = usdt_balance - ?, 
                 updated_at = NOW() 
             WHERE wallet_address = ? 
             AND usdt_balance >= ?`,
            [robotPrice, walletAddr, robotPrice]
        );
        
        // 检查是否成功扣款
        if (deductResult.affectedRows === 0) {
            await connection.rollback();  // 回滚（虽然还没有实际修改）
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }
        
        // 12. 插入购买记录（使用connection执行）
        const [purchaseResult] = await connection.execute(
            `INSERT INTO robot_purchases 
            (wallet_address, robot_id, robot_name, robot_type, price, token, status, 
             start_date, end_date, start_time, end_time, duration_hours, 
             quantify_interval_hours, daily_profit, total_profit, is_quantified, 
             expected_return, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, 'USDT', 'active', 
                    DATE(?), DATE(?), ?, ?, ?, 
                    ?, 0, 0, 0, 
                    ?, NOW(), NOW())`,
            [
                walletAddr, config.robot_id, robot_name, config.robot_type, robotPrice,
                startTime, endTime, formatDateTime(startTime), formatDateTime(endTime), config.duration,
                config.quantify_interval_hours || 0,
                expectedReturn
            ]
        );
        
        const purchaseId = purchaseResult.insertId;
        
        // 13. 处理推荐奖励等（使用connection执行）
        // ... 如果有其他数据库操作，也使用connection.execute() ...
        
        // ===== 提交事务 =====
        await connection.commit();
        
        // 14. 返回成功响应
        res.json({
            success: true,
            message: 'Purchase successful',
            data: {
                purchase_id: purchaseId,
                robot_name,
                price: robotPrice,
                start_time: formatDateTime(startTime),
                end_time: formatDateTime(endTime)
            }
        });
        
    } catch (error) {
        // 发生错误时回滚事务
        await connection.rollback();
        
        console.error('购买机器人失败:', error.message);
        res.status(500).json({
            success: false,
            message: 'Purchase failed'
        });
        
    } finally {
        // 释放连接
        connection.release();
    }
});
```

---

## 关键修改点总结

### 方法1（简单）- 3分钟
1. 修改第309-312行的UPDATE语句，添加 `AND usdt_balance >= ?`
2. 添加 `affectedRows` 检查

### 方法2（完整）- 15分钟
1. 导入 `pool` from `../../db.js`
2. `const connection = await pool.getConnection()`
3. `await connection.beginTransaction()`
4. 将所有 `dbQuery()` 改为 `connection.execute()`
5. 成功时 `await connection.commit()`
6. 失败时 `await connection.rollback()`
7. finally块 `connection.release()`

---

## 测试方案

### 测试1: 余额不足
```bash
curl -X POST http://localhost:3000/api/robot/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x测试地址",
    "robot_name": "Binance Ai Bot",
    "price": 999999
  }'
```
**期望**: 返回 "Insufficient balance"，余额不变

### 测试2: 正常购买
```bash
curl -X POST http://localhost:3000/api/robot/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x测试地址",
    "robot_name": "Binance Ai Bot",
    "price": 20
  }'
```
**期望**: 
- 返回成功
- 余额减少20
- robot_purchases表有新记录

### 测试3: 并发购买
同时发起2个相同的购买请求，检查是否会重复扣款。

---

## 建议

**立即执行**: 方法1（简单修复），5分钟内可完成  
**本周完成**: 方法2（完整事务），更安全可靠

---

**创建时间**: 2025-12-16  
**文件**: `/backend/src/routes/robotRoutes.js`  
**行号**: 175-400

