const ETH_RPC_URLS = [
  'https://api.zan.top/eth-mainnet',
  'https://eth.drpc.org',
  'https://eth.api.onfinality.io/public',
  'https://1rpc.io/eth',
  'https://ethereum.public.blockpi.network/v1/rpc/public',
  'https://eth.llamarpc.com',
  'https://eth.meowrpc.com',
  'https://ethereum-public.nodies.app',
  'https://ethereum-rpc.publicnode.com',
  'https://eth-pokt.nodies.app',
  'https://eth.merkle.io',
  'https://eth-mainnet.public.blastapi.io',
  'https://rpc.payload.de',
  'https://rpc.mevblocker.io',
  'https://rpc.flashbots.net',
  'https://cloudflare-eth.com',
  'https://ethereum.publicnode.com'
];

const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase();
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const MIN_DEPOSIT_AMOUNT = 20;
const USDT_DECIMALS = 6;
const BLOCKS_PER_SCAN = parseInt(process.env.ETH_BLOCKS_PER_SCAN) || 5;
// SECURITY: require N confirmations before crediting an ETH deposit, to survive reorgs.
const DEPOSIT_CONFIRMATIONS = parseInt(process.env.ETH_DEPOSIT_CONFIRMATIONS) || 12;
const SCAN_INTERVAL_MS = parseInt(process.env.ETH_SCAN_INTERVAL_MS) || 180000;
const INITIAL_SCAN_BLOCKS = 30;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 5000;
const MAX_BLOCK_LAG = 3000;
const RESET_BUFFER_BLOCKS = 30;
const MAX_HISTORY_PRUNED_ERRORS = 3;
const MAX_CONSECUTIVE_ERRORS = 10;

export {
  ETH_RPC_URLS,
  USDT_CONTRACT,
  TRANSFER_TOPIC,
  MIN_DEPOSIT_AMOUNT,
  USDT_DECIMALS,
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
