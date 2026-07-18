import express from 'express';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { ensureEmailSchema } from '../utils/emailSchema.js';
import {
  getEmailConfigStatus,
  sendBulkEmail,
  verifyEmailTransport
} from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV !== 'production' ? 'dev_jwt_secret_not_for_production' : null
);

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'JWT_SECRET 未配置'
    });
  }

  try {
    req.admin = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token 无效或已过期'
    });
  }
}

function cleanSubject(value) {
  return String(value || '').trim().slice(0, 200);
}

function cleanContent(value) {
  return String(value || '').trim().slice(0, 5000);
}

function normalizeWalletList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((wallet) => String(wallet || '').trim().toLowerCase())
      .filter((wallet) => /^0x[a-f0-9]{40}$/.test(wallet))
  )];
}

function parsePagination(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const rawPageSize = Math.max(parseInt(req.query.pageSize || '20', 10), 1);
  const pageSize = Math.min(rawPageSize, 200);
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

export function createAdminEmailRoutes({ dbQuery }) {
  const router = express.Router();
  let schemaReady = false;

  async function ensureReady() {
    if (schemaReady) return;
    await ensureEmailSchema(dbQuery);
    schemaReady = true;
  }

  router.get('/status', authMiddleware, async (req, res) => {
    try {
      const status = getEmailConfigStatus();
      res.json({
        success: true,
        data: {
          configured: status.configured,
          host: status.host,
          port: status.port,
          secure: status.secure,
          from_email: status.fromEmail,
          from_name: status.fromName
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取邮件配置失败'
      });
    }
  });

  router.post('/status/verify', authMiddleware, async (req, res) => {
    try {
      await verifyEmailTransport();
      res.json({ success: true, message: 'SMTP 配置验证通过' });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error?.message || 'SMTP 配置验证失败'
      });
    }
  });

  router.get('/users', authMiddleware, async (req, res) => {
    try {
      await ensureReady();
      const { page, pageSize, offset } = parsePagination(req);
      const keyword = String(req.query.keyword || '').trim();
      const boundOnly = String(req.query.bound_only || 'true') !== 'false';
      const clauses = [];
      const params = [];

      if (boundOnly) {
        clauses.push("email IS NOT NULL AND email <> ''");
      }

      if (keyword) {
        clauses.push('(wallet_address LIKE ? OR email LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const countRows = await dbQuery(
        `SELECT COUNT(*) AS total FROM user_balances ${where}`,
        params
      );
      const list = await dbQuery(
        `SELECT wallet_address, email, email_bound_at, usdt_balance, total_deposit, is_banned, created_at
         FROM user_balances
         ${where}
         ORDER BY email_bound_at DESC, created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: {
          list,
          total: countRows?.[0]?.total || 0,
          page,
          pageSize
        }
      });
    } catch (error) {
      console.error('获取邮件用户列表失败:', error.message);
      res.status(500).json({
        success: false,
        message: '获取邮件用户列表失败'
      });
    }
  });

  router.post('/send', authMiddleware, async (req, res) => {
    try {
      await ensureReady();

      const walletAddresses = normalizeWalletList(req.body.wallet_addresses);
      const subject = cleanSubject(req.body.subject);
      const content = cleanContent(req.body.content);

      if (walletAddresses.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择至少一个有效用户'
        });
      }

      if (walletAddresses.length > 200) {
        return res.status(400).json({
          success: false,
          message: '单次最多发送 200 名用户'
        });
      }

      if (!subject || subject.length < 2) {
        return res.status(400).json({
          success: false,
          message: '邮件标题至少 2 个字符'
        });
      }

      if (!content || content.length < 2) {
        return res.status(400).json({
          success: false,
          message: '邮件内容至少 2 个字符'
        });
      }

      const placeholders = walletAddresses.map(() => '?').join(',');
      const rows = await dbQuery(
        `SELECT wallet_address, email
         FROM user_balances
         WHERE LOWER(wallet_address) IN (${placeholders})
           AND email IS NOT NULL
           AND email <> ''`,
        walletAddresses
      );

      const recipients = rows.filter((row) => validator.isEmail(String(row.email || '')));
      if (recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: '所选用户都没有绑定有效邮箱'
        });
      }

      const sendResult = await sendBulkEmail({ recipients, subject, content });
      const adminUsername = req.admin?.username || 'unknown';
      await dbQuery(
        `INSERT INTO email_send_logs
         (admin_username, subject, content, recipient_count, success_count, failure_count, target_wallets, results_json, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          adminUsername,
          subject,
          content,
          recipients.length,
          sendResult.success_count,
          sendResult.failure_count,
          JSON.stringify(walletAddresses),
          JSON.stringify(sendResult.results),
          req.ip || req.connection?.remoteAddress || 'unknown'
        ]
      );

      await dbQuery(
        `INSERT INTO admin_operation_logs
         (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
         VALUES (?, ?, 'email_send', 'bulk_email', ?, ?, NOW())`,
        [
          req.admin?.id || 0,
          adminUsername,
          JSON.stringify({
            subject,
            selected_count: walletAddresses.length,
            recipient_count: recipients.length,
            success_count: sendResult.success_count,
            failure_count: sendResult.failure_count
          }),
          req.ip || req.connection?.remoteAddress || 'unknown'
        ]
      ).catch((error) => {
        console.warn('[AdminEmail] 写入操作日志失败:', error.message);
      });

      res.json({
        success: sendResult.failure_count === 0,
        message: `发送完成：成功 ${sendResult.success_count}，失败 ${sendResult.failure_count}`,
        data: {
          selected_count: walletAddresses.length,
          recipient_count: recipients.length,
          ...sendResult
        }
      });
    } catch (error) {
      console.error('群发邮件失败:', error.message);
      res.status(500).json({
        success: false,
        message: error?.message || '群发邮件失败'
      });
    }
  });

  return router;
}
