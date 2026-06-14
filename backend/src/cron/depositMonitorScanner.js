import {
  BSC_RPC_URLS,
  BLOCKS_PER_SCAN,
  DEPOSIT_CONFIRMATIONS,
  SCAN_INTERVAL_MS,
  INITIAL_SCAN_BLOCKS,
  MAX_BLOCK_LAG,
  MAX_HISTORY_PRUNED_ERRORS,
  MIN_DEPOSIT_AMOUNT
} from './depositMonitorConfig.js';
import {
  getPlatformWallet,
  setPlatformWallet,
  getLastCheckedBlock,
  setLastCheckedBlock,
  resetHistoryPrunedErrors,
  incrementHistoryPrunedErrors
} from './depositMonitorState.js';
import {
  loadLastCheckedBlock,
  saveLastCheckedBlock,
  autoResetBlockNumber,
  checkAndAutoReset
} from './depositMonitorBlocks.js';
import {
  getCurrentRpcUrl,
  loadPlatformWallet,
  getLatestBlockNumber,
  getUsdtTransferLogs,
  getConsecutiveErrors
} from './depositMonitorRpc.js';
import {
  parseTransferLog,
  processDeposit
} from './depositMonitorProcessor.js';

async function scanNewDeposits() {
  try {
    const latestBlock = await getLatestBlockNumber();

    if (getLastCheckedBlock() === 0) {
      setLastCheckedBlock(await loadLastCheckedBlock());

      if (getLastCheckedBlock() === 0) {
        const initialBlock = latestBlock - INITIAL_SCAN_BLOCKS;
        setLastCheckedBlock(initialBlock);
        console.log(`[DepositMonitor] 🚀 首次运行，从区块 ${initialBlock} 开始扫描`);
        await saveLastCheckedBlock(initialBlock);
      }
    }

    const wasReset = await checkAndAutoReset(latestBlock);
    if (wasReset) return;

    // SECURITY: only process blocks that have at least DEPOSIT_CONFIRMATIONS confirmations,
    // so a reorg near the chain head cannot leave a credited-but-unfinalized deposit.
    const confirmedBlock = latestBlock - DEPOSIT_CONFIRMATIONS;

    if (confirmedBlock <= getLastCheckedBlock()) {
      console.log(`[DepositMonitor] ⏭️  没有已确认的新区块 (最新: ${latestBlock}, 已确认: ${confirmedBlock}, 已检查: ${getLastCheckedBlock()})`);
      return;
    }

    const fromBlock = getLastCheckedBlock() + 1;
    const toBlock = Math.min(confirmedBlock, fromBlock + BLOCKS_PER_SCAN - 1);
    const blockCount = toBlock - fromBlock + 1;
    console.log(`[DepositMonitor] 🔍 扫描区块 ${fromBlock} 到 ${toBlock} (${blockCount} 个区块)`);

    const logs = await getUsdtTransferLogs(fromBlock, toBlock);
    resetHistoryPrunedErrors();

    if (logs.length > 0) {
      console.log(`[DepositMonitor] 📝 发现 ${logs.length} 笔转账到平台钱包`);
      for (const log of logs) {
        const transfer = parseTransferLog(log);
        await processDeposit(transfer);
      }
    }

    setLastCheckedBlock(toBlock);
    await saveLastCheckedBlock(toBlock);
    console.log(`[DepositMonitor] ✅ 区块号已更新: ${toBlock}`);
  } catch (error) {
    await handleScanError(error);
  }
}

async function handleScanError(error) {
  const errorMsg = error.message || String(error);
  console.error('[DepositMonitor] ❌ 扫描错误:', errorMsg);

  if (errorMsg.includes('pruned') || errorMsg.includes('History has been')) {
    const historyPrunedErrors = incrementHistoryPrunedErrors();
    console.log(`[DepositMonitor] ⚠️  历史数据错误计数: ${historyPrunedErrors}/${MAX_HISTORY_PRUNED_ERRORS}`);

    if (historyPrunedErrors >= MAX_HISTORY_PRUNED_ERRORS) {
      try {
        const latestBlock = await getLatestBlockNumber();
        await autoResetBlockNumber(latestBlock, `连续${historyPrunedErrors}次历史数据查询失败，RPC节点已修剪历史区块`);
      } catch (resetError) {
        console.error('[DepositMonitor] 自动重置失败:', resetError.message);
      }
    }
  }
}

async function triggerScan() {
  if (!getPlatformWallet()) {
    setPlatformWallet(await loadPlatformWallet());
  }
  console.log('[DepositMonitor] 🔄 手动触发扫描');
  await scanNewDeposits();
}

function startDepositMonitor() {
  (async () => {
    setPlatformWallet(await loadPlatformWallet());

    console.log('[DepositMonitor] 🚀 启动充值监控服务');
    console.log(`[DepositMonitor] ⚙️  配置: 每${SCAN_INTERVAL_MS / 1000}秒扫描${BLOCKS_PER_SCAN}个区块`);
    console.log(`[DepositMonitor] 🌐 RPC节点: ${BSC_RPC_URLS.length}个备用节点`);
    console.log(`[DepositMonitor] 🔄 自动重置: 落后>${MAX_BLOCK_LAG}区块 或 连续${MAX_HISTORY_PRUNED_ERRORS}次历史数据错误时自动重置`);
    console.log(`[DepositMonitor] 💰 平台钱包: ${getPlatformWallet()}`);
    console.log(`[DepositMonitor] 💵 最低充值: ${MIN_DEPOSIT_AMOUNT} USDT`);

    scanNewDeposits().catch((err) => {
      console.error('[DepositMonitor] ❌ 首次扫描失败:', err.message);
    });

    setInterval(() => {
      scanNewDeposits().catch((err) => {
        console.error('[DepositMonitor] ❌ 定时扫描失败:', err.message);
      });
    }, SCAN_INTERVAL_MS);
  })().catch((err) => {
    console.error('[DepositMonitor] ❌ 启动失败:', err.message);
  });
}

function getMonitorStatus() {
  return {
    isRunning: true,
    lastCheckedBlock: getLastCheckedBlock(),
    currentRpcUrl: getCurrentRpcUrl(),
    consecutiveErrors: getConsecutiveErrors(),
    config: {
      blocksPerScan: BLOCKS_PER_SCAN,
      scanIntervalMs: SCAN_INTERVAL_MS,
      minDepositAmount: MIN_DEPOSIT_AMOUNT,
      rpcNodes: BSC_RPC_URLS.length
    }
  };
}

export {
  scanNewDeposits,
  triggerScan,
  startDepositMonitor,
  getMonitorStatus
};
