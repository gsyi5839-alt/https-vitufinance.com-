import pool from '../../../db.js';
import { Decimal } from '../../utils/precisionDecimal.js';

const WALLET_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export class MarginRefundError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'MarginRefundError';
    this.statusCode = statusCode;
  }
}

function normalizeWalletAddress(walletAddress) {
  const walletAddr = String(walletAddress || '').trim().toLowerCase();
  if (!WALLET_ADDRESS_PATTERN.test(walletAddr)) {
    throw new MarginRefundError('钱包地址不合法');
  }
  return walletAddr;
}

function normalizeReason(reason) {
  const reasonText = String(reason || '').trim();
  if (reasonText.length < 2) {
    throw new MarginRefundError('请输入保证金退回原因');
  }
  return reasonText.slice(0, 240);
}

function normalizeRefundAmount(amount) {
  let refundAmount;
  try {
    refundAmount = new Decimal(String(amount ?? '').trim());
  } catch {
    throw new MarginRefundError('退回金额不合法');
  }

  if (!refundAmount.isFinite() || refundAmount.lte(0)) {
    throw new MarginRefundError('退回金额必须大于 0');
  }

  if (refundAmount.decimalPlaces() > 4) {
    throw new MarginRefundError('退回金额最多支持 4 位小数');
  }

  return refundAmount.toFixed(4);
}

export async function createMarginRefund({
  walletAddress,
  amount,
  reason,
  adminId = 0,
  adminUsername = 'unknown',
  ipAddress = 'unknown'
}) {
  const walletAddr = normalizeWalletAddress(walletAddress);
  const refundAmount = normalizeRefundAmount(amount);
  const reasonText = normalizeReason(reason);
  const adminName = String(adminUsername || 'unknown').slice(0, 50);
  const adminUserId = Number.isInteger(Number(adminId)) ? Number(adminId) : 0;

  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+08:00'");
    await connection.beginTransaction();

    const [dateRows] = await connection.query("SELECT DATE_FORMAT(NOW(), '%Y%m%d') AS date_part");
    const datePart = dateRows?.[0]?.date_part || '00000000';

    const [users] = await connection.query(
      `SELECT wallet_address, usdt_balance
       FROM user_balances
       WHERE LOWER(wallet_address) = LOWER(?)
       LIMIT 1
       FOR UPDATE`,
      [walletAddr]
    );

    if (!users || users.length === 0) {
      throw new MarginRefundError('用户不存在', 404);
    }

    const storedWallet = users[0].wallet_address;
    const beforeBalance = new Decimal(users[0].usdt_balance || 0).toFixed(4);
    const afterBalance = new Decimal(beforeBalance).plus(refundAmount).toFixed(4);

    const [updateResult] = await connection.query(
      `UPDATE user_balances
       SET usdt_balance = ?, updated_at = NOW()
       WHERE wallet_address = ?`,
      [afterBalance, storedWallet]
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error('Failed to update user balance');
    }

    const description = `Margin Refund: ${reasonText}`;
    const [txResult] = await connection.query(
      `INSERT INTO transaction_history
       (wallet_address, tx_type, amount, currency, token, direction, status, description, related_type, created_at)
       VALUES (?, 'margin_refund', ?, 'USDT', 'USDT', 'in', 'completed', ?, 'admin_margin_refund', NOW())`,
      [storedWallet, refundAmount, description]
    );

    const transactionId = txResult.insertId;
    const orderNo = `MR-${datePart}-${String(transactionId).padStart(8, '0')}`;

    await connection.query(
      `UPDATE transaction_history
       SET tx_hash = ?, related_id = ?
       WHERE id = ?`,
      [orderNo, transactionId, transactionId]
    );

    await connection.query(
      `INSERT INTO balance_logs
       (wallet_address, change_type, change_amount, balance_before, balance_after, related_id, remark, created_at)
       VALUES (?, 'admin_adjust', ?, ?, ?, ?, ?, NOW())`,
      [storedWallet, refundAmount, beforeBalance, afterBalance, transactionId, `${description}; order=${orderNo}`]
    );

    await connection.query(
      `INSERT INTO admin_operation_logs
       (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
       VALUES (?, ?, 'margin_refund', ?, ?, ?, NOW())`,
      [
        adminUserId,
        adminName,
        storedWallet,
        JSON.stringify({
          wallet_address: storedWallet,
          order_no: orderNo,
          transaction_id: transactionId,
          amount: refundAmount,
          before: { usdt: beforeBalance },
          after: { usdt: afterBalance },
          change: { usdt: refundAmount },
          reason: reasonText
        }),
        String(ipAddress || 'unknown').slice(0, 45)
      ]
    );

    await connection.commit();

    return {
      wallet_address: storedWallet,
      order_no: orderNo,
      transaction_id: transactionId,
      amount: refundAmount,
      before: { usdt: beforeBalance },
      after: { usdt: afterBalance }
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('[MarginRefund] rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    connection.release();
  }
}
