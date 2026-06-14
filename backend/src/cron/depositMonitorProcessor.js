import { formatUnits } from 'ethers';
import { query as dbQuery } from '../../db.js';
import { MIN_DEPOSIT_AMOUNT } from './depositMonitorConfig.js';

function parseTransferLog(log) {
  const from = '0x' + log.topics[1].slice(26);
  const to = '0x' + log.topics[2].slice(26);
  // FIX: BigInt integer division floored all decimals (49.9 → 49). Use full-precision
  // decimal formatting (USDT on BSC has 18 decimals).
  const amount = parseFloat(formatUnits(BigInt(log.data), 18));
  const txHash = log.transactionHash;
  const blockNumber = parseInt(log.blockNumber, 16);

  return {
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    amount,
    txHash,
    blockNumber
  };
}

async function processDeposit(transfer) {
  const { from, amount, txHash, blockNumber } = transfer;

  try {
    const existing = await dbQuery(
      'SELECT id FROM deposit_records WHERE tx_hash = ?',
      [txHash]
    );

    if (existing.length > 0) {
      console.log(`[DepositMonitor] ⏭️  交易已处理: ${txHash}`);
      return;
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      console.log(`[DepositMonitor] ⚠️  金额过小 (${amount} USDT < ${MIN_DEPOSIT_AMOUNT} USDT), 来自: ${from}`);
      await dbQuery(
        `INSERT INTO deposit_records
         (wallet_address, amount, token, network, tx_hash, status, created_at, remark)
         VALUES (?, ?, 'USDT', 'BSC', ?, 'failed', NOW(), '金额低于最低充值要求')`,
        [from, amount, txHash]
      );
      return;
    }

    console.log('[DepositMonitor] 🔔 检测到新充值:', {
      from,
      amount: `${amount} USDT`,
      txHash,
      block: blockNumber
    });

    await dbQuery(
      `INSERT INTO deposit_records
       (wallet_address, amount, token, network, tx_hash, status, created_at, completed_at)
       VALUES (?, ?, 'USDT', 'BSC', ?, 'completed', NOW(), NOW())`,
      [from, amount, txHash]
    );

    await creditUserDeposit(from, amount);
    console.log(`[DepositMonitor] ✅ 充值处理成功: ${amount} USDT → ${from}`);
  } catch (error) {
    console.error(`[DepositMonitor] ❌ 处理充值失败 (${txHash}):`, error.message);
    await logDepositError(transfer, error);
  }
}

async function creditUserDeposit(walletAddress, amount) {
  const userExists = await dbQuery(
    'SELECT id FROM user_balances WHERE wallet_address = ?',
    [walletAddress]
  );

  if (userExists.length === 0) {
    await dbQuery(
      `INSERT INTO user_balances
       (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at)
       VALUES (?, ?, 0, ?, 0, NOW(), NOW())`,
      [walletAddress, amount, amount]
    );
    console.log(`[DepositMonitor] 👤 创建新用户: ${walletAddress}`);
    return;
  }

  await dbQuery(
    `UPDATE user_balances
     SET usdt_balance = usdt_balance + ?,
         total_deposit = total_deposit + ?,
         updated_at = NOW()
     WHERE wallet_address = ?`,
    [amount, amount, walletAddress]
  );
}

async function logDepositError(transfer, error) {
  try {
    await dbQuery(
      `INSERT INTO error_logs (source, level, message, details, created_at)
       VALUES ('DepositMonitor', 'ERROR', ?, ?, NOW())`,
      [`处理充值失败: ${transfer.txHash}`, JSON.stringify({ transfer, error: error.message })]
    );
  } catch (logError) {
    // Ignore logging errors.
  }
}

export {
  parseTransferLog,
  processDeposit
};
