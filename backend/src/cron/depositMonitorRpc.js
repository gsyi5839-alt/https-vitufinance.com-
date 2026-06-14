import { query as dbQuery } from '../../db.js';
import { getPlatformWalletAddressByChain } from '../utils/platformWallet.js';
import {
  BSC_RPC_URLS,
  USDT_CONTRACT,
  TRANSFER_TOPIC,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  MAX_CONSECUTIVE_ERRORS
} from './depositMonitorConfig.js';
import {
  getCurrentRpcIndex,
  setCurrentRpcIndex,
  getPlatformWallet,
  incrementConsecutiveErrors,
  resetConsecutiveErrors,
  getConsecutiveErrors
} from './depositMonitorState.js';

function getCurrentRpcUrl() {
  return BSC_RPC_URLS[getCurrentRpcIndex()];
}

function switchToNextRpc() {
  setCurrentRpcIndex((getCurrentRpcIndex() + 1) % BSC_RPC_URLS.length);
  console.log(`[DepositMonitor] 🔄 切换RPC节点: ${getCurrentRpcUrl()}`);
  resetConsecutiveErrors();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPlatformWallet() {
  try {
    const wallet = await getPlatformWalletAddressByChain(dbQuery, 'BSC');
    return wallet.toLowerCase();
  } catch (error) {
    console.error('[DepositMonitor] 加载平台钱包失败，使用回退地址:', error.message);
    return (process.env.PLATFORM_WALLET_ADDRESS || '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4').toLowerCase();
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
      timeout: 10000
    });

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
      console.error(`[DepositMonitor] ⚠️ RPC限流 (节点: ${rpcUrl})`);

      if (retryCount < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`[DepositMonitor] ⏳ ${delay / 1000}秒后重试... (${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return jsonRpcRequest(method, params, retryCount + 1);
      }

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        switchToNextRpc();
      }
    } else {
      console.error('[DepositMonitor] ❌ RPC请求失败:', error.message || error);
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
  loadPlatformWallet,
  jsonRpcRequest,
  getLatestBlockNumber,
  getUsdtTransferLogs,
  getConsecutiveErrors
};
