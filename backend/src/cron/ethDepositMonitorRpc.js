import { query as dbQuery } from '../../db.js';
import { getPlatformWalletAddressByChain } from '../utils/platformWallet.js';
import {
  ETH_RPC_URLS,
  USDT_CONTRACT,
  TRANSFER_TOPIC,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  MAX_CONSECUTIVE_ERRORS
} from './ethDepositMonitorConfig.js';
import {
  getCurrentRpcIndex,
  setCurrentRpcIndex,
  getPlatformWallet,
  incrementConsecutiveErrors,
  resetConsecutiveErrors,
  getConsecutiveErrors
} from './ethDepositMonitorState.js';

function getCurrentRpcUrl() {
  return ETH_RPC_URLS[getCurrentRpcIndex()];
}

function switchToNextRpc() {
  setCurrentRpcIndex((getCurrentRpcIndex() + 1) % ETH_RPC_URLS.length);
  console.log(`[ETH-DepositMonitor] 🔄 Switched RPC node: ${getCurrentRpcUrl()}`);
  resetConsecutiveErrors();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPlatformWallet() {
  try {
    const wallet = await getPlatformWalletAddressByChain(dbQuery, 'ETH');
    return wallet.toLowerCase();
  } catch (error) {
    console.error('[ETH-DepositMonitor] Failed to load platform wallet from DB, using fallback:', error.message);
    return (process.env.PLATFORM_WALLET_ETH || '0x8a92c73FdE5d0313303989eB269d6d17ffb1ba9d').toLowerCase();
  }
}

async function jsonRpcRequest(method, params, retryCount = 0) {
  const rpcUrl = getCurrentRpcUrl();

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      }),
      timeout: 15000
    });

    if (response.status === 429) {
      incrementConsecutiveErrors();
      console.error(`[ETH-DepositMonitor] ⚠️ HTTP 429 rate limited (node: ${rpcUrl})`);
      switchToNextRpc();

      if (retryCount < MAX_RETRIES) {
        const delay = 2000 * (retryCount + 1);
        console.log(`[ETH-DepositMonitor] ⏳ Trying next node in ${delay / 1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return jsonRpcRequest(method, params, retryCount + 1);
      }

      throw new Error('HTTP 429: Too Many Requests - all retries exhausted');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw data.error;
    }

    resetConsecutiveErrors();
    return data.result;
  } catch (error) {
    const consecutiveErrors = incrementConsecutiveErrors();

    if (error.code === -32005 || error.message?.includes('limit exceeded')) {
      console.error(`[ETH-DepositMonitor] ⚠️ RPC rate limited (node: ${rpcUrl})`);

      if (retryCount < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`[ETH-DepositMonitor] ⏳ Retrying in ${delay / 1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return jsonRpcRequest(method, params, retryCount + 1);
      }

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        switchToNextRpc();
      }
    } else {
      console.error('[ETH-DepositMonitor] ❌ RPC request failed:', error.message || error);
    }

    throw error;
  }
}

async function getLatestBlockNumber() {
  const result = await jsonRpcRequest('eth_blockNumber', []);
  return parseInt(result, 16);
}

async function getUsdtTransferLogs(fromBlock, toBlock) {
  const platformWallet = getPlatformWallet();
  const params = [{
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
    address: USDT_CONTRACT,
    topics: [
      TRANSFER_TOPIC,
      null,
      `0x000000000000000000000000${platformWallet.slice(2)}`
    ]
  }];

  return await jsonRpcRequest('eth_getLogs', params);
}

export {
  getCurrentRpcUrl,
  switchToNextRpc,
  sleep,
  loadPlatformWallet,
  jsonRpcRequest,
  getLatestBlockNumber,
  getUsdtTransferLogs,
  getConsecutiveErrors
};
