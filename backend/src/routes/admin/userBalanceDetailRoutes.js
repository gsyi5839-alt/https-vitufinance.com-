import { express, dbQuery, authMiddleware } from './shared.js';

const router = express.Router();

router.get('/users/:wallet_address/diagnose', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();

    const userResult = await dbQuery(
      `SELECT wallet_address, usdt_balance, wld_balance, total_deposit,
              total_withdraw, manual_added_balance, created_at, updated_at
       FROM user_balances WHERE wallet_address = ?`,
      [walletAddr]
    );

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = userResult[0];
    const depositResult = await dbQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM deposit_records
       WHERE LOWER(wallet_address) = ? AND status = 'completed'`,
      [walletAddr]
    );
    const totalDeposits = parseFloat(depositResult[0]?.total) || 0;
    const depositCount = depositResult[0]?.count || 0;

    const withdrawResult = await dbQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM withdraw_records
       WHERE LOWER(wallet_address) = ? AND status = 'completed'`,
      [walletAddr]
    );
    const totalWithdrawals = parseFloat(withdrawResult[0]?.total) || 0;
    const withdrawCount = withdrawResult[0]?.count || 0;

    const robotResult = await dbQuery(
      `SELECT COALESCE(SUM(price), 0) as total_cost,
              COALESCE(SUM(total_profit), 0) as total_profit,
              COUNT(*) as count
       FROM robot_purchases
       WHERE LOWER(wallet_address) = ?`,
      [walletAddr]
    );
    const totalRobotCost = parseFloat(robotResult[0]?.total_cost) || 0;
    const totalRobotProfit = parseFloat(robotResult[0]?.total_profit) || 0;
    const robotCount = robotResult[0]?.count || 0;

    const referralResult = await dbQuery(
      `SELECT COALESCE(SUM(reward_amount), 0) as total, COUNT(*) as count
       FROM referral_rewards
       WHERE LOWER(wallet_address) = ?`,
      [walletAddr]
    );
    const totalReferralReward = parseFloat(referralResult[0]?.total) || 0;

    const teamResult = await dbQuery(
      `SELECT COALESCE(SUM(reward_amount), 0) as total, COUNT(*) as count
       FROM team_rewards
       WHERE LOWER(wallet_address) = ?`,
      [walletAddr]
    );
    const totalTeamReward = parseFloat(teamResult[0]?.total) || 0;
    const marginRefundResult = await dbQuery(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM transaction_history
       WHERE LOWER(wallet_address) = ?
         AND tx_type = 'margin_refund'
         AND direction = 'in'
         AND status IN ('completed', 'success')`,
      [walletAddr]
    );
    const totalMarginRefund = parseFloat(marginRefundResult[0]?.total) || 0;
    const manualAdded = parseFloat(user.manual_added_balance) || 0;
    const expectedBalance = totalDeposits - totalWithdrawals - totalRobotCost +
      totalRobotProfit + totalReferralReward + totalTeamReward + totalMarginRefund + manualAdded;
    const currentBalance = parseFloat(user.usdt_balance);
    const difference = currentBalance - expectedBalance;

    const recentDeposits = await dbQuery(
      `SELECT id, amount, status, tx_hash, created_at
       FROM deposit_records
       WHERE LOWER(wallet_address) = ?
       ORDER BY created_at DESC LIMIT 10`,
      [walletAddr]
    );
    const recentWithdrawals = await dbQuery(
      `SELECT id, amount, status, created_at
       FROM withdraw_records
       WHERE LOWER(wallet_address) = ?
       ORDER BY created_at DESC LIMIT 10`,
      [walletAddr]
    );
    const recentRobots = await dbQuery(
      `SELECT id, robot_name, price, total_profit, status, created_at
       FROM robot_purchases
       WHERE LOWER(wallet_address) = ?
       ORDER BY created_at DESC LIMIT 10`,
      [walletAddr]
    );

    res.json({
      success: true,
      data: {
        wallet_address: user.wallet_address,
        current_balance: {
          usdt: parseFloat(user.usdt_balance).toFixed(4),
          wld: parseFloat(user.wld_balance).toFixed(4)
        },
        stored_totals: {
          total_deposit: parseFloat(user.total_deposit).toFixed(4),
          total_withdraw: parseFloat(user.total_withdraw).toFixed(4),
          manual_added: manualAdded.toFixed(4)
        },
        calculated: {
          deposits: { total: totalDeposits.toFixed(4), count: depositCount },
          withdrawals: { total: totalWithdrawals.toFixed(4), count: withdrawCount },
          robots: {
            cost: totalRobotCost.toFixed(4),
            profit: totalRobotProfit.toFixed(4),
            count: robotCount
          },
          referral_reward: totalReferralReward.toFixed(4),
          team_reward: totalTeamReward.toFixed(4),
          margin_refund: {
            total: totalMarginRefund.toFixed(4),
            count: marginRefundResult[0]?.count || 0
          }
        },
        analysis: {
          expected_balance: expectedBalance.toFixed(4),
          actual_balance: currentBalance.toFixed(4),
          difference: difference.toFixed(4),
          is_mismatch: Math.abs(difference) > 0.01,
          has_negative_expected: expectedBalance < 0
        },
        field_mismatches: {
          total_deposit: Math.abs(parseFloat(user.total_deposit) - totalDeposits) > 0.01
            ? { stored: parseFloat(user.total_deposit).toFixed(4), calculated: totalDeposits.toFixed(4) }
            : null,
          total_withdraw: Math.abs(parseFloat(user.total_withdraw) - totalWithdrawals) > 0.01
            ? { stored: parseFloat(user.total_withdraw).toFixed(4), calculated: totalWithdrawals.toFixed(4) }
            : null
        },
        recent_transactions: {
          deposits: recentDeposits.map(d => ({
            id: d.id,
            amount: parseFloat(d.amount).toFixed(4),
            status: d.status,
            created_at: d.created_at
          })),
          withdrawals: recentWithdrawals.map(w => ({
            id: w.id,
            amount: parseFloat(w.amount).toFixed(4),
            status: w.status,
            created_at: w.created_at
          })),
          robots: recentRobots.map(r => ({
            id: r.id,
            name: r.robot_name,
            cost: parseFloat(r.price).toFixed(4),
            profit: parseFloat(r.total_profit).toFixed(4),
            status: r.status
          }))
        },
        timestamps: {
          created_at: user.created_at,
          updated_at: user.updated_at,
          diagnosed_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('用户余额诊断失败:', error.message);
    res.status(500).json({
      success: false,
      message: '诊断失败: ' + error.message
    });
  }
});

router.get('/users/:wallet_address/balance-details', authMiddleware, async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const walletAddr = wallet_address.toLowerCase();
    const userResult = await dbQuery(
      `SELECT wallet_address, usdt_balance, wld_balance, total_deposit,
              total_withdraw, manual_added_balance, created_at, updated_at
       FROM user_balances WHERE wallet_address = ?`,
      [walletAddr]
    );

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const user = userResult[0];
    const transactions = [];
    const deposits = await dbQuery(
      'SELECT id, amount, status, tx_hash, network, created_at, completed_at FROM deposit_records WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC',
      [walletAddr]
    );
    for (const d of deposits) {
      transactions.push({
        id: `deposit_${d.id}`,
        type: 'deposit',
        type_cn: '充值',
        amount: d.status === 'completed' ? parseFloat(d.amount) : 0,
        display_amount: parseFloat(d.amount),
        status: d.status,
        affects_balance: d.status === 'completed',
        description: `充值 ${parseFloat(d.amount).toFixed(4)} USDT`,
        tx_hash: d.tx_hash,
        network: d.network,
        created_at: d.created_at
      });
    }

    const withdrawals = await dbQuery(
      'SELECT id, amount, fee, status, to_address, tx_hash, created_at, completed_at FROM withdraw_records WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC',
      [walletAddr]
    );
    for (const w of withdrawals) {
      transactions.push({
        id: `withdraw_${w.id}`,
        type: 'withdraw',
        type_cn: '提款',
        amount: w.status === 'completed' ? -parseFloat(w.amount) : 0,
        display_amount: parseFloat(w.amount),
        fee: parseFloat(w.fee || 0),
        status: w.status,
        affects_balance: w.status === 'completed',
        description: `提款 ${parseFloat(w.amount).toFixed(4)} USDT`,
        to_address: w.to_address,
        tx_hash: w.tx_hash,
        created_at: w.created_at
      });
    }

    const robots = await dbQuery(
      `SELECT id, robot_name, price, total_profit, status, daily_profit,
              start_time, end_time, created_at
       FROM robot_purchases WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC`,
      [walletAddr]
    );
    for (const r of robots) {
      transactions.push({
        id: `robot_buy_${r.id}`,
        type: 'robot_purchase',
        type_cn: '购买机器人',
        amount: -parseFloat(r.price),
        display_amount: parseFloat(r.price),
        status: r.status,
        affects_balance: true,
        description: `购买 ${r.robot_name} (${r.status})`,
        robot_id: r.id,
        robot_name: r.robot_name,
        daily_profit: r.daily_profit,
        created_at: r.created_at
      });
    }

    const quantifyLogs = await dbQuery(
      'SELECT id, robot_purchase_id, robot_name, earnings, created_at FROM robot_quantify_logs WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC',
      [walletAddr]
    );
    for (const q of quantifyLogs) {
      transactions.push({
        id: `quantify_${q.id}`,
        type: 'robot_earning',
        type_cn: '量化收益',
        amount: parseFloat(q.earnings),
        display_amount: parseFloat(q.earnings),
        status: 'completed',
        affects_balance: true,
        description: `${q.robot_name} 量化收益`,
        robot_id: q.robot_purchase_id,
        robot_name: q.robot_name,
        created_at: q.created_at
      });
    }

    await appendRewardAndAdminTransactions({ walletAddr, transactions });
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let runningBalance = 0;
    const transactionsWithBalance = [];
    for (const tx of [...transactions].reverse()) {
      if (tx.affects_balance) runningBalance += tx.amount;
      transactionsWithBalance.unshift({ ...tx, running_balance: runningBalance });
    }

    const totals = calculateTotals(transactions);
    res.json({
      success: true,
      data: {
        user: {
          wallet_address: user.wallet_address,
          current_usdt_balance: parseFloat(user.usdt_balance).toFixed(4),
          current_wld_balance: parseFloat(user.wld_balance).toFixed(4),
          stored_total_deposit: parseFloat(user.total_deposit).toFixed(4),
          stored_total_withdraw: parseFloat(user.total_withdraw).toFixed(4),
          manual_added: parseFloat(user.manual_added_balance || 0).toFixed(4),
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        totals: {
          deposits: totals.deposits.toFixed(4),
          withdrawals: totals.withdrawals.toFixed(4),
          robot_purchases: totals.robot_purchases.toFixed(4),
          robot_earnings: totals.robot_earnings.toFixed(4),
          referral_rewards: totals.referral_rewards.toFixed(4),
          team_rewards: totals.team_rewards.toFixed(4),
          margin_refunds: totals.margin_refunds.toFixed(4),
          admin_adjustments: totals.admin_adjustments.toFixed(4),
          calculated_balance: totals.calculated_balance.toFixed(4),
          balance_difference: (parseFloat(user.usdt_balance) - totals.calculated_balance).toFixed(4)
        },
        transactions: transactionsWithBalance,
        transaction_count: transactions.length
      }
    });
  } catch (error) {
    console.error('获取用户余额明细失败:', error.message);
    res.status(500).json({
      success: false,
      message: '获取明细失败: ' + error.message
    });
  }
});

async function appendRewardAndAdminTransactions({ walletAddr, transactions }) {
  const referralRewards = await dbQuery(
    `SELECT id, from_wallet, level, reward_rate, reward_amount,
            source_type, robot_name, source_amount, created_at
     FROM referral_rewards WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC`,
    [walletAddr]
  );
  for (const r of referralRewards) {
    transactions.push({
      id: `referral_${r.id}`,
      type: 'referral_reward',
      type_cn: '推荐奖励',
      amount: parseFloat(r.reward_amount),
      display_amount: parseFloat(r.reward_amount),
      status: 'completed',
      affects_balance: true,
      description: `${r.level}级推荐奖励 (${r.reward_rate}%) 来自 ${r.from_wallet.slice(-8)}`,
      from_wallet: r.from_wallet,
      level: r.level,
      reward_rate: r.reward_rate,
      source_type: r.source_type,
      created_at: r.created_at
    });
  }

  const teamRewards = await dbQuery(
    'SELECT id, reward_type, reward_amount, broker_level, created_at FROM team_rewards WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC',
    [walletAddr]
  );
  for (const t of teamRewards) {
    transactions.push({
      id: `team_${t.id}`,
      type: 'team_reward',
      type_cn: '团队奖励',
      amount: parseFloat(t.reward_amount),
      display_amount: parseFloat(t.reward_amount),
      status: 'completed',
      affects_balance: true,
      description: `团队${t.reward_type}奖励 (等级${t.broker_level})`,
      reward_type: t.reward_type,
      broker_level: t.broker_level,
      created_at: t.created_at
    });
  }

  const marginRefunds = await dbQuery(
    `SELECT id,
            COALESCE(tx_hash, CONCAT('MR-', LPAD(id, 8, '0'))) AS order_no,
            amount, token, status, description, created_at
     FROM transaction_history
     WHERE LOWER(wallet_address) = ?
       AND tx_type = 'margin_refund'
       AND direction = 'in'
     ORDER BY created_at DESC`,
    [walletAddr]
  );
  for (const m of marginRefunds) {
    const completed = ['completed', 'success'].includes(String(m.status || '').toLowerCase());
    transactions.push({
      id: `margin_refund_${m.id}`,
      type: 'margin_refund',
      type_cn: '保证金退还',
      amount: completed ? parseFloat(m.amount) : 0,
      display_amount: parseFloat(m.amount),
      status: m.status,
      affects_balance: completed,
      description: m.description || 'Margin Refund',
      order_no: m.order_no,
      token: m.token || 'USDT',
      created_at: m.created_at
    });
  }

  try {
    const adminLogs = await dbQuery(
      `SELECT id, operation_type, operation_detail, admin_username, created_at
       FROM admin_operation_logs
       WHERE operation_type LIKE '%balance%' AND operation_detail LIKE ?
       ORDER BY created_at DESC LIMIT 50`,
      [`%${walletAddr}%`]
    );
    for (const log of adminLogs) {
      appendAdminAdjustmentTransaction({ log, walletAddr, transactions });
    }
  } catch (error) {
    console.log('[Balance Details] Admin logs query skipped:', error.message);
  }
}

function appendAdminAdjustmentTransaction({ log, walletAddr, transactions }) {
  try {
    const details = JSON.parse(log.operation_detail);
    if (details.wallet_address !== walletAddr || !details.change) return;

    const usdtChange = parseFloat(details.change.usdt) || 0;
    if (usdtChange === 0) return;

    transactions.push({
      id: `admin_${log.id}`,
      type: 'admin_adjustment',
      type_cn: '管理员调整',
      amount: usdtChange,
      display_amount: Math.abs(usdtChange),
      status: 'completed',
      affects_balance: true,
      description: `管理员 ${log.admin_username} 调整余额`,
      admin: log.admin_username,
      before: details.before,
      after: details.after,
      created_at: log.created_at
    });
  } catch {
    // Skip invalid JSON.
  }
}

function calculateTotals(transactions) {
  const totals = {
    deposits: transactions.filter(t => t.type === 'deposit' && t.affects_balance).reduce((sum, t) => sum + t.amount, 0),
    withdrawals: Math.abs(transactions.filter(t => t.type === 'withdraw' && t.affects_balance).reduce((sum, t) => sum + t.amount, 0)),
    robot_purchases: Math.abs(transactions.filter(t => t.type === 'robot_purchase').reduce((sum, t) => sum + t.amount, 0)),
    robot_earnings: transactions.filter(t => t.type === 'robot_earning').reduce((sum, t) => sum + t.amount, 0),
    referral_rewards: transactions.filter(t => t.type === 'referral_reward').reduce((sum, t) => sum + t.amount, 0),
    team_rewards: transactions.filter(t => t.type === 'team_reward').reduce((sum, t) => sum + t.amount, 0),
    margin_refunds: transactions.filter(t => t.type === 'margin_refund' && t.affects_balance).reduce((sum, t) => sum + t.amount, 0),
    admin_adjustments: transactions.filter(t => t.type === 'admin_adjustment').reduce((sum, t) => sum + t.amount, 0)
  };
  totals.calculated_balance = totals.deposits - totals.withdrawals - totals.robot_purchases +
    totals.robot_earnings + totals.referral_rewards + totals.team_rewards + totals.margin_refunds + totals.admin_adjustments;
  return totals;
}

export default router;
