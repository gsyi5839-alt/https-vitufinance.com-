import {
  ETH_RPC_URLS,
  BLOCKS_PER_SCAN,
  DEPOSIT_CONFIRMATIONS,
  SCAN_INTERVAL_MS,
  INITIAL_SCAN_BLOCKS,
  MAX_BLOCK_LAG,
  MAX_HISTORY_PRUNED_ERRORS,
  MIN_DEPOSIT_AMOUNT,
  USDT_DECIMALS
} from './ethDepositMonitorConfig.js';
import {
  getPlatformWallet,
  setPlatformWallet,
  getLastCheckedBlock,
  setLastCheckedBlock,
  resetHistoryPrunedErrors,
  incrementHistoryPrunedErrors
} from './ethDepositMonitorState.js';
import {
  loadLastCheckedBlock,
  saveLastCheckedBlock,
  autoResetBlockNumber,
  checkAndAutoReset
} from './ethDepositMonitorBlocks.js';
import {
  getCurrentRpcUrl,
  sleep,
  loadPlatformWallet,
  getLatestBlockNumber,
  getUsdtTransferLogs,
  getConsecutiveErrors
} from './ethDepositMonitorRpc.js';
import {
  parseTransferLog,
  processDeposit
} from './ethDepositMonitorProcessor.js';

async function scanNewDeposits() {
  try {
    const latestBlock = await getLatestBlockNumber();

    if (getLastCheckedBlock() === 0) {
      setLastCheckedBlock(await loadLastCheckedBlock());

      if (getLastCheckedBlock() === 0) {
        const initialBlock = latestBlock - INITIAL_SCAN_BLOCKS;
        setLastCheckedBlock(initialBlock);
        console.log(`[ETH-DepositMonitor] 🚀 First run, starting from block ${initialBlock}`);
        await saveLastCheckedBlock(initialBlock);
      }
    }

    const wasReset = await checkAndAutoReset(latestBlock);
    if (wasReset) return;

    // SECURITY: only process blocks with at least DEPOSIT_CONFIRMATIONS confirmations
    // so a reorg near the chain head cannot leave a credited-but-unfinalized deposit.
    const confirmedBlock = latestBlock - DEPOSIT_CONFIRMATIONS;

    if (confirmedBlock <= getLastCheckedBlock()) {
      console.log(`[ETH-DepositMonitor] ⏭️  No confirmed new blocks (latest: ${latestBlock}, confirmed: ${confirmedBlock}, checked: ${getLastCheckedBlock()})`);
      return;
    }

    const fromBlock = getLastCheckedBlock() + 1;
    const toBlock = Math.min(confirmedBlock, fromBlock + BLOCKS_PER_SCAN - 1);
    const blockCount = toBlock - fromBlock + 1;
    console.log(`[ETH-DepositMonitor] 🔍 Scanning blocks ${fromBlock} to ${toBlock} (${blockCount} blocks)`);

    await sleep(1000);
    const logs = await getUsdtTransferLogs(fromBlock, toBlock);
    resetHistoryPrunedErrors();

    if (logs.length > 0) {
      console.log(`[ETH-DepositMonitor] 📝 Found ${logs.length} transfers to platform wallet`);
      for (const log of logs) {
        const transfer = parseTransferLog(log);
        await processDeposit(transfer);
      }
    }

    setLastCheckedBlock(toBlock);
    await saveLastCheckedBlock(toBlock);
    console.log(`[ETH-DepositMonitor] ✅ Block number updated: ${toBlock}`);
  } catch (error) {
    await handleScanError(error);
  }
}

async function handleScanError(error) {
  const errorMsg = error.message || String(error);
  console.error('[ETH-DepositMonitor] ❌ Scan error:', errorMsg);

  if (errorMsg.includes('pruned') || errorMsg.includes('History has been')) {
    const historyPrunedErrors = incrementHistoryPrunedErrors();
    console.log(`[ETH-DepositMonitor] ⚠️  History error count: ${historyPrunedErrors}/${MAX_HISTORY_PRUNED_ERRORS}`);

    if (historyPrunedErrors >= MAX_HISTORY_PRUNED_ERRORS) {
      try {
        const latestBlock = await getLatestBlockNumber();
        await autoResetBlockNumber(latestBlock, `${historyPrunedErrors} consecutive history errors, RPC has pruned historical data`);
      } catch (resetError) {
        console.error('[ETH-DepositMonitor] Auto-reset failed:', resetError.message);
      }
    }
  }
}

async function triggerScan() {
  if (!getPlatformWallet()) {
    setPlatformWallet(await loadPlatformWallet());
  }
  console.log('[ETH-DepositMonitor] 🔄 Manual scan triggered');
  await scanNewDeposits();
}

async function startEthDepositMonitor() {
  setPlatformWallet(await loadPlatformWallet());

  console.log('[ETH-DepositMonitor] 🚀 Starting ETH deposit monitor');
  console.log(`[ETH-DepositMonitor] ⚙️  Config: scan ${BLOCKS_PER_SCAN} blocks every ${SCAN_INTERVAL_MS / 1000}s`);
  console.log(`[ETH-DepositMonitor] 🌐 RPC nodes: ${ETH_RPC_URLS.length} backup nodes`);
  console.log(`[ETH-DepositMonitor] 🔄 Auto-reset: when lag > ${MAX_BLOCK_LAG} blocks or ${MAX_HISTORY_PRUNED_ERRORS} consecutive history errors`);
  console.log(`[ETH-DepositMonitor] 💰 Platform wallet: ${getPlatformWallet()}`);
  console.log(`[ETH-DepositMonitor] 💵 Minimum deposit: ${MIN_DEPOSIT_AMOUNT} USDT`);
  console.log(`[ETH-DepositMonitor] 🔢 USDT decimals: ${USDT_DECIMALS} (ETH ERC-20)`);

  scanNewDeposits().catch((err) => {
    console.error('[ETH-DepositMonitor] ❌ Initial scan failed:', err.message);
  });

  setInterval(() => {
    scanNewDeposits().catch((err) => {
      console.error('[ETH-DepositMonitor] ❌ Scheduled scan failed:', err.message);
    });
  }, SCAN_INTERVAL_MS);
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
      rpcNodes: ETH_RPC_URLS.length,
      usdtDecimals: USDT_DECIMALS
    }
  };
}

export {
  scanNewDeposits,
  triggerScan,
  startEthDepositMonitor,
  getMonitorStatus
};
