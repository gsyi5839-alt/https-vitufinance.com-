import { query as dbQuery } from '../../db.js';
import {
  MAX_BLOCK_LAG,
  RESET_BUFFER_BLOCKS
} from './ethDepositMonitorConfig.js';
import {
  getLastCheckedBlock,
  setLastCheckedBlock,
  resetHistoryPrunedErrors,
  resetConsecutiveErrors
} from './ethDepositMonitorState.js';

async function loadLastCheckedBlock() {
  try {
    const result = await dbQuery(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'eth_deposit_last_checked_block'`
    );

    if (result && result.length > 0) {
      const blockNumber = parseInt(result[0].setting_value);
      console.log(`[ETH-DepositMonitor] 📖 Loaded block number from DB: ${blockNumber}`);
      return blockNumber;
    }
  } catch (error) {
    console.error('[ETH-DepositMonitor] Failed to load block number:', error.message);
  }

  return 0;
}

async function saveLastCheckedBlock(blockNumber) {
  try {
    await dbQuery(
      `INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
       VALUES ('eth_deposit_last_checked_block', ?, 'ETH deposit monitor last checked block', NOW())
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
      [blockNumber.toString(), blockNumber.toString()]
    );
  } catch (error) {
    console.error('[ETH-DepositMonitor] Failed to save block number:', error.message);
  }
}

async function autoResetBlockNumber(latestBlock, reason) {
  const oldBlock = getLastCheckedBlock();
  const newBlock = latestBlock - RESET_BUFFER_BLOCKS;

  console.log(`[ETH-DepositMonitor] ⚠️  ${reason}`);
  console.log(`[ETH-DepositMonitor] 🔄 Auto-reset block: ${oldBlock} → ${newBlock}`);

  setLastCheckedBlock(newBlock);
  await saveLastCheckedBlock(newBlock);
  resetHistoryPrunedErrors();
  resetConsecutiveErrors();

  console.log(`[ETH-DepositMonitor] ✅ Block number reset, will continue from ${newBlock}`);
}

async function checkAndAutoReset(latestBlock) {
  const blockLag = latestBlock - getLastCheckedBlock();
  if (blockLag > MAX_BLOCK_LAG) {
    await autoResetBlockNumber(latestBlock, `Block lag too large (${blockLag} > ${MAX_BLOCK_LAG})`);
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
