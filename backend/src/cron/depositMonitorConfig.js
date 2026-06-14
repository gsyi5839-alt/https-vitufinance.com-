const BSC_RPC_URLS = [
  'https://bsc-mainnet.nodereal.io/v1/0e91c33451a94222bdb4a68a6e4a708d',
  'https://bsc.publicnode.com',
  'https://bsc-dataseed.binance.org/',
  'https://bsc-dataseed1.defibit.io/'
];

const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'.toLowerCase();
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_DEPOSIT_AMOUNT = 20;
const BLOCKS_PER_SCAN = parseInt(process.env.BLOCKS_PER_SCAN) || 10;
// SECURITY: require N confirmations before crediting a deposit, to survive chain reorgs.
const DEPOSIT_CONFIRMATIONS = parseInt(process.env.DEPOSIT_CONFIRMATIONS) || 15;
const SCAN_INTERVAL_MS = parseInt(process.env.SCAN_INTERVAL_MS) || 60000;
const INITIAL_SCAN_BLOCKS = 50;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 5000;
const MAX_BLOCK_LAG = 5000;
const RESET_BUFFER_BLOCKS = 50;
const MAX_HISTORY_PRUNED_ERRORS = 3;
const MAX_CONSECUTIVE_ERRORS = 10;

export {
  BSC_RPC_URLS,
  USDT_CONTRACT,
  TRANSFER_TOPIC,
  MIN_DEPOSIT_AMOUNT,
  BLOCKS_PER_SCAN,
  DEPOSIT_CONFIRMATIONS,
  SCAN_INTERVAL_MS,
  INITIAL_SCAN_BLOCKS,
  MAX_RETRIES,
  BASE_RETRY_DELAY,
  MAX_BLOCK_LAG,
  RESET_BUFFER_BLOCKS,
  MAX_HISTORY_PRUNED_ERRORS,
  MAX_CONSECUTIVE_ERRORS
};
