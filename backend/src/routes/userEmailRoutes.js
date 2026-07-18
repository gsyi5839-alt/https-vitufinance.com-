import express from 'express';
import validator from 'validator';
import {
  isValidWalletAddress,
  normalizeWalletAddress
} from '../security/index.js';
import { recordSuspiciousActivity } from '../middleware/security.js';
import { ensureEmailSchema } from '../utils/emailSchema.js';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return validator.isEmail(value, {
    allow_utf8_local_part: false,
    require_tld: true
  });
}

export function createUserEmailRoutes({ dbQuery }) {
  const router = express.Router();

  router.get('/status', async (req, res) => {
    try {
      const { wallet_address } = req.query;

      if (!wallet_address || !isValidWalletAddress(wallet_address)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format'
        });
      }

      const walletAddr = normalizeWalletAddress(wallet_address);
      const rows = await dbQuery(
        'SELECT email, email_bound_at FROM user_balances WHERE wallet_address = ?',
        [walletAddr]
      );

      const email = rows?.[0]?.email || '';
      res.json({
        success: true,
        data: {
          wallet_address: walletAddr,
          bound: Boolean(email),
          email,
          email_bound_at: rows?.[0]?.email_bound_at || null
        }
      });
    } catch (error) {
      console.error('获取邮箱绑定状态失败:', error.message);
      res.status(500).json({
        success: false,
        message: '获取邮箱绑定状态失败'
      });
    }
  });

  router.post('/bind', async (req, res) => {
    try {
      const { wallet_address, email } = req.body;

      if (!wallet_address || !isValidWalletAddress(wallet_address)) {
        recordSuspiciousActivity(req.ip, '无效的钱包地址格式');
        return res.status(400).json({
          success: false,
          message: 'Invalid wallet address format'
        });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: '请输入有效邮箱地址'
        });
      }

      const walletAddr = normalizeWalletAddress(wallet_address);
      await dbQuery(
        `INSERT INTO user_balances
         (wallet_address, email, email_bound_at, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at)
         VALUES (?, ?, NOW(), 0, 0, 0, 0, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           email_bound_at = IF(email IS NULL OR email <> VALUES(email), NOW(), email_bound_at),
           email = VALUES(email),
           updated_at = NOW()`,
        [walletAddr, normalizedEmail]
      );

      res.json({
        success: true,
        message: '邮箱绑定成功',
        data: {
          wallet_address: walletAddr,
          email: normalizedEmail
        }
      });
    } catch (error) {
      console.error('绑定邮箱失败:', error.message);
      res.status(500).json({
        success: false,
        message: '绑定邮箱失败'
      });
    }
  });

  return router;
}

export { ensureEmailSchema as initUserEmailSchema };
