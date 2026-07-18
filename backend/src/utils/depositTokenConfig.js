export const CHAIN_CONFIGS = {
    BSC: {
        name: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        rpcUrls: [
            'https://bsc-dataseed.binance.org/',
            'https://bsc-rpc.publicnode.com',
            'https://bsc.publicnode.com'
        ],
        usdtContract: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        tokens: {
            USDT: {
                contract: '0x55d398326f99059fF775485246999027B3197955',
                decimals: 18
            }
        },
        platformWallet: '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4'
    },
    ETH: {
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://ethereum-rpc.publicnode.com',
        rpcUrls: [
            'https://ethereum-rpc.publicnode.com',
            'https://eth.drpc.org',
            'https://eth.api.onfinality.io/public',
            'https://1rpc.io/eth',
            'https://ethereum.publicnode.com',
            'https://eth.llamarpc.com'
        ],
        usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        tokens: {
            USDT: {
                contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                decimals: 6
            },
            USDC: {
                contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6
            }
        },
        platformWallet: '0x8a92c73FdE5d0313303989eB269d6d17ffb1ba9d'
    }
};

const ALLOWED_CHAINS = Object.keys(CHAIN_CONFIGS);
const ALLOWED_TOKENS = ['USDT', 'USDC'];

export function normalizeChain(chain) {
    const candidate = chain?.toUpperCase();
    return ALLOWED_CHAINS.includes(candidate) ? candidate : 'BSC';
}

export function normalizeToken(token) {
    const candidate = String(token || 'USDT').toUpperCase();
    return ALLOWED_TOKENS.includes(candidate) ? candidate : null;
}

export function getTokenConfig(chainConfig, token) {
    if (chainConfig.tokens?.[token]) {
        return chainConfig.tokens[token];
    }

    if (token === 'USDT') {
        return {
            contract: chainConfig.usdtContract,
            decimals: chainConfig.decimals
        };
    }

    return null;
}

export function rawAmountToNumber(rawAmount, decimals) {
    const base = 10n ** BigInt(decimals);
    const whole = rawAmount / base;
    const fraction = (rawAmount % base)
        .toString()
        .padStart(decimals, '0')
        .replace(/0+$/, '');

    return Number(fraction ? `${whole}.${fraction}` : whole.toString());
}
