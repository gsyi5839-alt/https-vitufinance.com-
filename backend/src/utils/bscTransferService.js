/**
 * BSC Transfer Service
 * Handles USDT transfers on Binance Smart Chain
 */

import { ethers } from 'ethers';

// BSC USDT contract address
const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

// USDT ABI (minimal for transfer)
const USDT_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

// Provider and wallet instances
let provider = null;
let wallet = null;
let usdtContract = null;

/**
 * Initialize BSC provider and wallet
 */
export async function initializeBSCProvider() {
    try {
        const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org:443';
        const privateKey = process.env.TRANSFER_PRIVATE_KEY;
        
        // Create provider
        provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Test connection
        const network = await provider.getNetwork();
        console.log(`[BSC] Connected to network: ${network.name} (chainId: ${network.chainId})`);
        
        // Create wallet if private key is provided
        if (privateKey) {
            wallet = new ethers.Wallet(privateKey, provider);
            usdtContract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, wallet);
            
            const balance = await provider.getBalance(wallet.address);
            console.log(`[BSC] Wallet address: ${wallet.address}`);
            console.log(`[BSC] BNB balance: ${ethers.formatEther(balance)} BNB`);
            
            const usdtBalance = await usdtContract.balanceOf(wallet.address);
            console.log(`[BSC] USDT balance: ${ethers.formatUnits(usdtBalance, 18)} USDT`);
        } else {
            console.log('[BSC] No private key provided, transfer functions disabled');
        }
        
        return true;
    } catch (error) {
        console.error('[BSC] Failed to initialize:', error.message);
        return false;
    }
}

/**
 * Get current BNB balance
 * @param {string} address - Wallet address
 * @returns {string} Balance in BNB
 */
export async function getBNBBalance(address) {
    if (!provider) {
        throw new Error('BSC provider not initialized');
    }
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
}

/**
 * Get current USDT balance
 * @param {string} address - Wallet address
 * @returns {string} Balance in USDT
 */
export async function getUSDTBalance(address) {
    if (!provider) {
        throw new Error('BSC provider not initialized');
    }
    const contract = new ethers.Contract(USDT_CONTRACT, USDT_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 18);
}

/**
 * Transfer USDT to an address
 * @param {string} toAddress - Recipient address
 * @param {string|number} amount - Amount in USDT
 * @returns {Object} Transaction result
 */
export async function transferUSDT(toAddress, amount) {
    if (!wallet || !usdtContract) {
        throw new Error('BSC wallet not initialized');
    }
    
    try {
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        
        // Check balance
        const balance = await usdtContract.balanceOf(wallet.address);
        if (balance < amountWei) {
            throw new Error('Insufficient USDT balance');
        }
        
        // Get gas price
        const gasPrice = ethers.parseUnits(process.env.GAS_PRICE || '5', 'gwei');
        
        // Send transaction
        const tx = await usdtContract.transfer(toAddress, amountWei, {
            gasPrice,
            gasLimit: 100000
        });
        
        console.log(`[BSC] Transfer initiated: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`[BSC] Transfer confirmed in block ${receipt.blockNumber}`);
        
        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        };
    } catch (error) {
        console.error('[BSC] Transfer failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if auto transfer is enabled
 * @returns {boolean}
 */
export function isAutoTransferEnabled() {
    return process.env.ENABLE_AUTO_TRANSFER === 'true' && wallet !== null;
}

/**
 * Get wallet address
 * @returns {string|null}
 */
export function getWalletAddress() {
    return wallet ? wallet.address : null;
}

/**
 * Get account address (alias for getWalletAddress)
 * @returns {string|null}
 */
export function getAccountAddress() {
    return wallet ? wallet.address : null;
}

/**
 * Get account balance (BNB and USDT)
 * @returns {Object} Balance info
 */
export async function getAccountBalance() {
    if (!wallet) {
        return { bnb: '0', usdt: '0' };
    }
    try {
        const bnbBalance = await provider.getBalance(wallet.address);
        const usdtBalance = await usdtContract.balanceOf(wallet.address);
        return {
            bnb: ethers.formatEther(bnbBalance),
            usdt: ethers.formatUnits(usdtBalance, 18)
        };
    } catch (error) {
        console.error('[BSC] Failed to get balance:', error.message);
        return { bnb: '0', usdt: '0' };
    }
}

export default {
    initializeBSCProvider,
    getBNBBalance,
    getUSDTBalance,
    transferUSDT,
    isAutoTransferEnabled,
    getWalletAddress
};

