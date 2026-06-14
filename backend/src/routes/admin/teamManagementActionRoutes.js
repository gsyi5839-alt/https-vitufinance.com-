import { express, dbQuery, authMiddleware, secureLog } from './shared.js';

const router = express.Router();

router.post('/team-management/award-referral', authMiddleware, async (req, res) => {
  try {
    const { wallet_address, amount, reason, from_wallet = 'system' } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!wallet_address || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address or amount' });
    }

    const walletAddr = wallet_address.toLowerCase();
    const awardAmount = parseFloat(amount);
    const userCheck = await dbQuery('SELECT wallet_address FROM user_balances WHERE wallet_address = ?', [walletAddr]);
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await dbQuery(
      'UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?',
      [awardAmount, walletAddr]
    );
    await dbQuery(
      `INSERT INTO referral_rewards
       (to_wallet, from_wallet, reward_amount, level, source_type, robot_id, created_at)
       VALUES (?, ?, ?, 0, 'admin_award', 0, NOW())`,
      [walletAddr, from_wallet, awardAmount]
    );
    await dbQuery(
      `INSERT INTO transaction_history
       (wallet_address, type, amount, token, description, status, created_at)
       VALUES (?, 'admin_referral_award', ?, 'USDT', ?, 'completed', NOW())`,
      [walletAddr, awardAmount, reason || `Admin awarded referral bonus by ${adminUsername}`]
    );
    await logTeamOperation(req, adminUsername, 'AWARD_REFERRAL', walletAddr, { amount: awardAmount, reason });

    secureLog('info', `Referral bonus awarded: ${awardAmount} USDT to ${walletAddr} by ${adminUsername}`);
    res.json({
      success: true,
      message: `Successfully awarded ${awardAmount} USDT referral bonus`,
      data: { wallet_address: walletAddr, amount: awardAmount }
    });
  } catch (error) {
    console.error('[TeamManagement] Error awarding referral:', error);
    res.status(500).json({ success: false, message: 'Failed to award referral bonus' });
  }
});

router.post('/team-management/award-dividend', authMiddleware, async (req, res) => {
  try {
    const { wallet_address, amount, broker_level, reason } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!wallet_address || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address or amount' });
    }

    const walletAddr = wallet_address.toLowerCase();
    const awardAmount = parseFloat(amount);
    const level = parseInt(broker_level) || 1;
    const userCheck = await dbQuery('SELECT wallet_address FROM user_balances WHERE wallet_address = ?', [walletAddr]);
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await dbQuery(
      'UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?',
      [awardAmount, walletAddr]
    );

    const today = new Date().toISOString().slice(0, 10);
    await dbQuery(
      `INSERT INTO team_dividend_records
       (wallet_address, broker_level, reward_amount, reward_date, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [walletAddr, level, awardAmount, today]
    );
    await dbQuery(
      `INSERT INTO transaction_history
       (wallet_address, type, amount, token, description, status, created_at)
       VALUES (?, 'admin_team_dividend', ?, 'USDT', ?, 'completed', NOW())`,
      [walletAddr, awardAmount, reason || `Admin awarded team dividend by ${adminUsername}`]
    );
    await logTeamOperation(req, adminUsername, 'AWARD_DIVIDEND', walletAddr, { amount: awardAmount, broker_level: level, reason });

    secureLog('info', `Team dividend awarded: ${awardAmount} USDT to ${walletAddr} (Level ${level}) by ${adminUsername}`);
    res.json({
      success: true,
      message: `Successfully awarded ${awardAmount} USDT team dividend`,
      data: { wallet_address: walletAddr, amount: awardAmount, broker_level: level }
    });
  } catch (error) {
    console.error('[TeamManagement] Error awarding dividend:', error);
    res.status(500).json({ success: false, message: 'Failed to award team dividend' });
  }
});

router.put('/team-management/broker-level', authMiddleware, async (req, res) => {
  try {
    const { wallet_address, new_level, reason } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!wallet_address || new_level === undefined || new_level < 0 || new_level > 5) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address or level (0-5)' });
    }

    const walletAddr = wallet_address.toLowerCase();
    const brokerLevel = parseInt(new_level);
    const currentRows = await dbQuery(
      'SELECT broker_level FROM broker_levels WHERE wallet_address = ?',
      [walletAddr]
    );
    const oldLevel = currentRows[0]?.broker_level || 0;

    await dbQuery(
      `INSERT INTO broker_levels (wallet_address, broker_level, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE broker_level = ?, updated_at = NOW()`,
      [walletAddr, brokerLevel, brokerLevel]
    );
    await logTeamOperation(req, adminUsername, 'CHANGE_BROKER_LEVEL', walletAddr, { old_level: oldLevel, new_level: brokerLevel, reason });

    secureLog('info', `Broker level changed: ${walletAddr} from ${oldLevel} to ${brokerLevel} by ${adminUsername}`);
    res.json({
      success: true,
      message: `Broker level updated from ${oldLevel} to ${brokerLevel}`,
      data: { wallet_address: walletAddr, old_level: oldLevel, new_level: brokerLevel }
    });
  } catch (error) {
    console.error('[TeamManagement] Error changing broker level:', error);
    res.status(500).json({ success: false, message: 'Failed to change broker level' });
  }
});

router.post('/team-management/batch-award', authMiddleware, async (req, res) => {
  try {
    const { awards, award_type, reason } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!awards || !Array.isArray(awards) || awards.length === 0) {
      return res.status(400).json({ success: false, message: 'No awards provided' });
    }
    if (!['referral', 'dividend'].includes(award_type)) {
      return res.status(400).json({ success: false, message: 'Invalid award type (referral or dividend)' });
    }

    const result = await processBatchAwards({ awards, award_type, reason, adminUsername });
    await logTeamOperation(req, adminUsername, 'BATCH_AWARD', 'batch', {
      award_type,
      count: result.success,
      total_amount: result.totalAmount,
      reason
    });

    secureLog('info', `Batch ${award_type} award: ${result.success} users, ${result.totalAmount} USDT total by ${adminUsername}`);
    res.json({
      success: true,
      message: `Batch awarded ${result.success} users, failed ${result.failed}`,
      data: {
        success: result.success,
        failed: result.failed,
        total_amount: result.totalAmount,
        results: result.results.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('[TeamManagement] Error batch awarding:', error);
    res.status(500).json({ success: false, message: 'Failed to batch award' });
  }
});

router.post('/team-management/adjust-balance', authMiddleware, async (req, res) => {
  try {
    const { wallet_address, amount, operation_type, reason } = req.body;
    const adminUsername = req.admin?.username || 'admin';

    if (!wallet_address) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }
    if (!operation_type || !['increase', 'decrease', 'set'].includes(operation_type)) {
      return res.status(400).json({ success: false, message: 'Invalid operation type (increase, decrease, or set)' });
    }

    const walletAddr = wallet_address.toLowerCase();
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount < 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    if (operation_type !== 'set' && inputAmount === 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const userCheck = await dbQuery('SELECT wallet_address, usdt_balance FROM user_balances WHERE wallet_address = ?', [walletAddr]);
    if (!userCheck || userCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentBalance = parseFloat(userCheck[0].usdt_balance || 0);
    const { newBalance, finalAmount } = calculateAdjustedBalance(currentBalance, inputAmount, operation_type);
    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Current: ${currentBalance} USDT, new balance would be: ${newBalance} USDT`
      });
    }

    if (operation_type === 'set') {
      await dbQuery('UPDATE user_balances SET usdt_balance = ?, updated_at = NOW() WHERE wallet_address = ?', [newBalance, walletAddr]);
    } else {
      await dbQuery('UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?', [finalAmount, walletAddr]);
    }

    const operationText = operation_type === 'set' ? 'set to' : operation_type;
    await dbQuery(
      `INSERT INTO transaction_history
       (wallet_address, type, amount, token, description, status, created_at)
       VALUES (?, 'admin_balance_adjustment', ?, 'USDT', ?, 'completed', NOW())`,
      [walletAddr, finalAmount, reason || `Admin balance adjustment (${operationText} ${operation_type === 'set' ? inputAmount : ''}) by ${adminUsername}`]
    );
    await logTeamOperation(req, adminUsername, 'ADJUST_BALANCE', walletAddr, {
      operation: operation_type,
      input_amount: inputAmount,
      change_amount: finalAmount,
      old_balance: currentBalance,
      new_balance: newBalance,
      reason
    });

    secureLog('info', `Balance adjusted: ${walletAddr} ${operation_type} ${inputAmount} USDT (${currentBalance} -> ${newBalance}, change: ${finalAmount}) by ${adminUsername}`);
    res.json({
      success: true,
      message: `Successfully adjusted balance: ${operation_type} ${operation_type === 'set' ? 'to' : ''} ${inputAmount} USDT`,
      data: {
        wallet_address: walletAddr,
        operation_type,
        input_amount: inputAmount,
        change_amount: finalAmount,
        old_balance: currentBalance,
        new_balance: newBalance
      }
    });
  } catch (error) {
    console.error('[TeamManagement] Error adjusting balance:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust balance' });
  }
});

async function processBatchAwards({ awards, award_type, reason, adminUsername }) {
  let success = 0;
  let failed = 0;
  let totalAmount = 0;
  const results = [];

  for (const award of awards) {
    try {
      const { wallet_address, amount, broker_level = 1 } = award;
      if (!wallet_address || !amount || amount <= 0) {
        failed++;
        results.push({ wallet_address, status: 'invalid_params' });
        continue;
      }

      const walletAddr = wallet_address.toLowerCase();
      const awardAmount = parseFloat(amount);
      const userCheck = await dbQuery('SELECT wallet_address FROM user_balances WHERE wallet_address = ?', [walletAddr]);
      if (!userCheck || userCheck.length === 0) {
        failed++;
        results.push({ wallet_address: walletAddr, status: 'user_not_found' });
        continue;
      }

      await dbQuery('UPDATE user_balances SET usdt_balance = usdt_balance + ?, updated_at = NOW() WHERE wallet_address = ?', [awardAmount, walletAddr]);

      if (award_type === 'referral') {
        await dbQuery(
          `INSERT INTO referral_rewards (to_wallet, from_wallet, reward_amount, level, source_type, robot_id, created_at)
           VALUES (?, 'system', ?, 0, 'batch_admin_award', 0, NOW())`,
          [walletAddr, awardAmount]
        );
      } else {
        const today = new Date().toISOString().slice(0, 10);
        await dbQuery(
          `INSERT INTO team_dividend_records (wallet_address, broker_level, reward_amount, reward_date, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [walletAddr, broker_level, awardAmount, today]
        );
      }

      await dbQuery(
        `INSERT INTO transaction_history (wallet_address, type, amount, token, description, status, created_at)
         VALUES (?, ?, ?, 'USDT', ?, 'completed', NOW())`,
        [walletAddr, `batch_${award_type}_award`, awardAmount, reason || `Batch ${award_type} award by ${adminUsername}`]
      );

      success++;
      totalAmount += awardAmount;
      results.push({ wallet_address: walletAddr, amount: awardAmount, status: 'success' });
    } catch (error) {
      failed++;
      results.push({ wallet_address: award.wallet_address, status: 'error', error: error.message });
    }
  }

  return { success, failed, totalAmount, results };
}

function calculateAdjustedBalance(currentBalance, inputAmount, operationType) {
  if (operationType === 'set') {
    return { newBalance: inputAmount, finalAmount: inputAmount - currentBalance };
  }
  if (operationType === 'increase') {
    if (inputAmount === 0) throw new Error('Amount must be greater than 0');
    return { newBalance: currentBalance + inputAmount, finalAmount: inputAmount };
  }
  if (inputAmount === 0) throw new Error('Amount must be greater than 0');
  return { newBalance: currentBalance - inputAmount, finalAmount: -inputAmount };
}

async function logTeamOperation(req, adminUsername, operationType, target, detail) {
  await dbQuery(
    `INSERT INTO admin_operation_logs
     (admin_id, admin_username, operation_type, operation_target, operation_detail, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [req.admin?.id || 0, adminUsername, operationType, target, JSON.stringify(detail), req.ip]
  );
}

export default router;
