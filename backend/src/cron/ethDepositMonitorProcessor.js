import { formatUnits } from 'ethers';
import { query as dbQuery } from '../../db.js';
import {
  MIN_DEPOSIT_AMOUNT,
  USDT_DECIMALS
} from './ethDepositMonitorConfig.js';

function parseTransferLog(log) {
  const from = '0x' + log.topics[1].slice(26);
  const to = '0x' + log.topics[2].slice(26);
  const rawAmount = BigInt(log.data);
  // FIX: use full-precision decimal formatting instead of Number() division,
  // which loses precision for large values (ETH USDT has 6 decimals).
  const amount = parseFloat(formatUnits(rawAmount, USDT_DECIMALS));
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
      console.log(`[ETH-DepositMonitor] ⏭️  Transaction already processed: ${txHash}`);
      return;
    }

    if (amount < MIN_DEPOSIT_AMOUNT) {
      console.log(`[ETH-DepositMonitor] ⚠️  Amount too small (${amount} USDT < ${MIN_DEPOSIT_AMOUNT} USDT), from: ${from}`);
      await dbQuery(
        `INSERT INTO deposit_records
         (wallet_address, amount, token, network, tx_hash, status, created_at, remark)
         VALUES (?, ?, 'USDT', 'ETH', ?, 'failed', NOW(), 'Amount below minimum requirement')`,
        [from, amount, txHash]
      );
      return;
    }

    console.log('[ETH-DepositMonitor] 🔔 New ETH deposit detected:', {
      from,
      amount: `${amount} USDT`,
      txHash,
      block: blockNumber
    });

    await dbQuery(
      `INSERT INTO deposit_records
       (wallet_address, amount, token, network, tx_hash, status, created_at, completed_at)
       VALUES (?, ?, 'USDT', 'ETH', ?, 'completed', NOW(), NOW())`,
      [from, amount, txHash]
    );

    await creditUserDeposit(from, amount);
    console.log(`[ETH-DepositMonitor] ✅ Deposit processed: ${amount} USDT → ${from}`);
  } catch (error) {
    console.error(`[ETH-DepositMonitor] ❌ Failed to process deposit (${txHash}):`, error.message);
    await logDepositError(txHash, error);
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
    console.log(`[ETH-DepositMonitor] 👤 Created new user: ${walletAddress}`);
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

async function logDepositError(txHash, error) {
  try {
    await dbQuery(
      `INSERT INTO error_logs (source, level, message, created_at)
       VALUES ('ETH-DepositMonitor', 'ERROR', ?, NOW())`,
      [`Failed to process deposit: ${txHash} - ${error.message}`]
    );
  } catch (logError) {
    // Ignore logging errors.
  }
}

export {
  parseTransferLog,
  processDeposit
};
