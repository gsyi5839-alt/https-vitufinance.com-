import {
  express,
  dbQuery,
  authMiddleware,
  secureLog,
  transferUSDT,
  getAccountAddress,
  getAccountBalance
} from './shared.js';

const router = express.Router();

router.post('/withdrawals/:id/auto-transfer', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { to_address } = req.body;

    if (!to_address) {
      return res.status(400).json({ success: false, message: '请提供接收地址' });
    }

    if (process.env.ENABLE_AUTO_TRANSFER !== 'true') {
      return res.status(403).json({ success: false, message: '自动转账功能未启用' });
    }

    const withdrawal = await dbQuery('SELECT * FROM withdraw_records WHERE id = ?', [id]);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: '提款记录不存在' });
    }

    if (withdrawal.status !== 'processing' && withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `提款状态为 "${withdrawal.status}"，无法进行自动转账`
      });
    }

    console.log(`[Auto-Transfer] 开始处理提款 ID: ${id}`);
    console.log(`[Auto-Transfer] 金额: ${withdrawal.amount} ${withdrawal.token}`);
    console.log(`[Auto-Transfer] 接收地址: ${to_address}`);

    const transferResult = await transferUSDT(
      to_address,
      withdrawal.amount,
      id,
      withdrawal.wallet_address
    );

    if (!transferResult.success) {
      console.error(`[Auto-Transfer] ❌ 转账失败: ${transferResult.error}`);
      return res.status(400).json({
        success: false,
        message: `自动转账失败: ${transferResult.error}`,
        error_detail: transferResult.error
      });
    }

    await dbQuery(
      'UPDATE withdraw_records SET status = ?, tx_hash = ?, completed_at = NOW() WHERE id = ?',
      ['completed', transferResult.txHash, id]
    );

    console.log(`[Auto-Transfer] ✓ 提款 ${id} 已完成`);
    console.log(`[Auto-Transfer] 交易哈希: ${transferResult.txHash}`);
    console.log(`[Auto-Transfer] 区块号: ${transferResult.blockNumber}`);

    secureLog('自动转账成功', {
      admin: req.admin.username,
      withdrawal_id: id,
      tx_hash: transferResult.txHash,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: '转账成功',
      data: {
        tx_hash: transferResult.txHash,
        block_number: transferResult.blockNumber,
        amount: transferResult.amount,
        gas_used: transferResult.gasUsed
      }
    });
  } catch (error) {
    console.error('自动转账失败:', error.message);
    res.status(500).json({
      success: false,
      message: '自动转账失败: ' + error.message
    });
  }
});

router.get('/wallet-info', authMiddleware, async (req, res) => {
  try {
    const accountAddress = getAccountAddress();

    if (!accountAddress) {
      return res.status(400).json({
        success: false,
        message: '自动转账功能未启用或未配置'
      });
    }

    const balance = await getAccountBalance();

    res.json({
      success: true,
      data: {
        wallet_address: accountAddress,
        usdt_balance: balance,
        enable_auto_transfer: process.env.ENABLE_AUTO_TRANSFER === 'true'
      }
    });
  } catch (error) {
    console.error('获取钱包信息失败:', error.message);
    res.status(500).json({ success: false, message: '获取钱包信息失败' });
  }
});

router.get('/withdrawals/:id/transfer-record', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[API] 获取提款 ${id} 的转账记录`);

    const transferLog = await dbQuery(
      'SELECT tx_hash, from_address, to_address, amount, block_number, gas_used, status, created_at FROM transfer_logs WHERE withdrawal_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    console.log('[API] transfer_logs 查询结果:', transferLog);

    if (transferLog && transferLog.tx_hash) {
      console.log(`[API] ✅ 从 transfer_logs 找到哈希: ${transferLog.tx_hash}`);
      return res.json({ success: true, data: transferLog });
    }

    const withdrawal = await dbQuery(
      'SELECT tx_hash, to_address, amount, created_at FROM withdraw_records WHERE id = ?',
      [id]
    );

    console.log('[API] withdraw_records 查询结果:', withdrawal);

    if (withdrawal && withdrawal.tx_hash) {
      console.log(`[API] ✅ 从 withdraw_records 找到哈希: ${withdrawal.tx_hash}`);
      return res.json({
        success: true,
        data: {
          tx_hash: withdrawal.tx_hash,
          to_address: withdrawal.to_address,
          amount: withdrawal.amount,
          created_at: withdrawal.created_at,
          status: 'completed'
        }
      });
    }

    console.log(`[API] ❌ 未找到提款 ${id} 的转账记录`);
    return res.json({ success: false, message: '未找到该提款的转账记录' });
  } catch (error) {
    console.error('获取转账记录失败:', error.message);
    res.status(500).json({ success: false, message: '获取转账记录失败' });
  }
});

export default router;
