import { query as dbQuery } from '../../db.js';
import {
  MAX_BLOCK_LAG,
  RESET_BUFFER_BLOCKS
} from './depositMonitorConfig.js';
import {
  getLastCheckedBlock,
  setLastCheckedBlock,
  resetHistoryPrunedErrors,
  resetConsecutiveErrors
} from './depositMonitorState.js';

async function loadLastCheckedBlock() {
  try {
    const result = await dbQuery(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'deposit_last_checked_block'`
    );

    if (result && result.length > 0) {
      const blockNumber = parseInt(result[0].setting_value);
      console.log(`[DepositMonitor] 📖 从数据库加载区块号: ${blockNumber}`);
      return blockNumber;
    }
  } catch (error) {
    console.error('[DepositMonitor] 读取区块号失败:', error.message);
  }

  return 0;
}

async function saveLastCheckedBlock(blockNumber) {
  try {
    await dbQuery(
      `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
       VALUES ('deposit_last_checked_block', ?, '充值监控最后检查的区块号', NOW())
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [blockNumber.toString(), blockNumber.toString()]
    );
  } catch (error) {
    console.error('[DepositMonitor] 保存区块号失败:', error.message);
  }
}

async function autoResetBlockNumber(latestBlock, reason) {
  const oldBlock = getLastCheckedBlock();
  const newBlock = latestBlock - RESET_BUFFER_BLOCKS;

  console.log(`[DepositMonitor] ⚠️  ${reason}`);
  console.log(`[DepositMonitor] 🔄 自动重置区块号: ${oldBlock} → ${newBlock}`);

  setLastCheckedBlock(newBlock);
  await saveLastCheckedBlock(newBlock);
  resetHistoryPrunedErrors();
  resetConsecutiveErrors();

  console.log(`[DepositMonitor] ✅ 区块号已重置，将从 ${newBlock} 继续扫描`);
}

async function checkAndAutoReset(latestBlock) {
  const blockLag = latestBlock - getLastCheckedBlock();
  if (blockLag > MAX_BLOCK_LAG) {
    await autoResetBlockNumber(latestBlock, `区块落后过多 (${blockLag} 个区块，超过阈值 ${MAX_BLOCK_LAG})`);
    return true;
  }

  return false;
}

export {
  loadLastCheckedBlock,
  saveLastCheckedBlock,
  autoResetBlockNumber,
  checkAndAutoReset
};
