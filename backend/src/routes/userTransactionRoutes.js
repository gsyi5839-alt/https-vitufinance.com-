import express from 'express';
import {
    isValidAmount,
    isValidTxHash,
    isValidWalletAddress,
    normalizeWalletAddress,
    secureLog
} from '../security/index.js';
import { sensitiveLimiter, recordSuspiciousActivity } from '../middleware/security.js';
import { getPlatformWalletAddressByChain } from '../utils/platformWallet.js';
import {
    CHAIN_CONFIGS,
    getTokenConfig,
    normalizeChain,
    normalizeToken,
    rawAmountToNumber
} from '../utils/depositTokenConfig.js';

async function getTransactionReceipt(txHash, chainConfig) {
    const response = await fetch(chainConfig.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash]
        })
    });

    return response.json();
}

async function verifyChainTransaction(txHash, expectedFrom, expectedTo, expectedAmount, chain = 'BSC', token = 'USDT') {
    try {
        const chainConfig = CHAIN_CONFIGS[chain];
        if (!chainConfig) {
            return { valid: false, message: `Unsupported chain: ${chain}` };
        }

        const tokenConfig = getTokenConfig(chainConfig, token);
        if (!tokenConfig) {
            return { valid: false, message: `${token} deposits are not supported on ${chain}` };
        }

        console.log(`[Deposit] Verifying ${chain} ${token} transaction:`, txHash);
        const data = await getTransactionReceipt(txHash, chainConfig);

        if (!data.result) {
            console.log(`[Deposit] ${chain} Transaction pending, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 5000));

            const retryData = await getTransactionReceipt(txHash, chainConfig);
            if (!retryData.result) {
                return { valid: false, message: 'Transaction not found or still pending' };
            }

            data.result = retryData.result;
        }

        const receipt = data.result;
        if (receipt.status !== '0x1') {
            return { valid: false, message: 'Transaction failed on blockchain' };
        }

        if (receipt.from.toLowerCase() !== expectedFrom.toLowerCase()) {
            return { valid: false, message: 'Transaction sender does not match' };
        }

        const tokenContract = tokenConfig.contract.toLowerCase();
        if (receipt.to.toLowerCase() !== tokenContract) {
            return { valid: false, message: `Transaction is not a ${chain} ${token} transfer` };
        }

        const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        const transferLog = receipt.logs.find(log =>
            log.topics[0] === transferTopic &&
            log.address.toLowerCase() === tokenContract
        );

        if (!transferLog) {
            return { valid: false, message: `No ${token} transfer found in ${chain} transaction` };
        }

        const toAddress = `0x${transferLog.topics[2].slice(26)}`;
        if (toAddress.toLowerCase() !== expectedTo.toLowerCase()) {
            return { valid: false, message: 'Transfer recipient does not match platform wallet' };
        }

        const rawAmount = BigInt(transferLog.data);
        const actualAmount = rawAmountToNumber(rawAmount, tokenConfig.decimals);
        if (Math.abs(actualAmount - expectedAmount) > 0.01) {
            return {
                valid: false,
                message: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`,
                actualAmount
            };
        }

        console.log(`[Deposit] ${chain} Transaction verified successfully:`, {
            txHash,
            from: receipt.from,
            to: toAddress,
            amount: actualAmount,
            chain,
            token
        });

        return { valid: true, message: 'Transaction verified', actualAmount };
    } catch (error) {
        console.error(`[Deposit] ${chain} Transaction verification error:`, error);
        return { valid: false, message: `Failed to verify transaction: ${error.message}` };
    }
}

export function createUserTransactionRoutes({ dbQuery, processUplineDailyDividends }) {
    const router = express.Router();

    router.post('/deposit', sensitiveLimiter, async (req, res) => {
        try {
            const { wallet_address, amount, tx_hash, token = 'USDT', chain = 'BSC' } = req.body;

            if (!wallet_address || !amount || !tx_hash) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address, amount, and tx_hash are required'
                });
            }

            if (!isValidWalletAddress(wallet_address)) {
                recordSuspiciousActivity(req.ip, '充值：无效的钱包地址');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }

            if (!isValidTxHash(tx_hash)) {
                recordSuspiciousActivity(req.ip, '充值：无效的交易哈希');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction hash format'
                });
            }

            if (!isValidAmount(amount, 0.0001, 1000000)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount (must be between 0.0001 and 1000000)'
                });
            }

            const safeChain = normalizeChain(chain);
            const safeToken = normalizeToken(token);
            if (!safeToken) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported token: ${token}`
                });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const depositAmount = parseFloat(amount);

            const existingDeposit = await dbQuery(
                'SELECT id FROM deposit_records WHERE tx_hash = ?',
                [tx_hash]
            );

            if (existingDeposit.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This transaction has already been processed'
                });
            }

            const platformWallet = await getPlatformWalletAddressByChain(
                dbQuery,
                safeChain,
                CHAIN_CONFIGS
            );
            const verification = await verifyChainTransaction(
                tx_hash,
                walletAddr,
                platformWallet,
                depositAmount,
                safeChain,
                safeToken
            );

            if (!verification.valid) {
                recordSuspiciousActivity(req.ip, `充值验证失败: ${verification.message}`);
                return res.status(400).json({
                    success: false,
                    message: verification.message
                });
            }

            const actualDepositAmount = verification.actualAmount || depositAmount;
            const normalizedWalletAddr = walletAddr.toLowerCase();
            await dbQuery(
                'INSERT INTO deposit_records (wallet_address, amount, token, network, tx_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [normalizedWalletAddr, actualDepositAmount, safeToken, safeChain, tx_hash, 'completed']
            );

            const userExists = await dbQuery(
                'SELECT id FROM user_balances WHERE wallet_address = ?',
                [normalizedWalletAddr]
            );

            if (userExists.length === 0) {
                await dbQuery(
                    'INSERT INTO user_balances (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at) VALUES (?, ?, 0, ?, 0, NOW(), NOW())',
                    [normalizedWalletAddr, actualDepositAmount, actualDepositAmount]
                );
            } else {
                await dbQuery(
                    'UPDATE user_balances SET usdt_balance = usdt_balance + ?, total_deposit = total_deposit + ?, updated_at = NOW() WHERE wallet_address = ?',
                    [actualDepositAmount, actualDepositAmount, normalizedWalletAddr]
                );
            }

            await dbQuery(
                'UPDATE deposit_records SET status = ?, completed_at = NOW() WHERE tx_hash = ?',
                ['completed', tx_hash]
            );

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance, wld_balance FROM user_balances WHERE wallet_address = ?',
                [normalizedWalletAddr]
            );

            secureLog('充值成功', {
                wallet_address: normalizedWalletAddr,
                amount: actualDepositAmount,
                tx_hash,
                chain: safeChain,
                token: safeToken
            });

            res.json({
                success: true,
                message: 'Deposit successful',
                data: {
                    wallet_address: normalizedWalletAddr,
                    amount: actualDepositAmount.toFixed(4),
                    token: safeToken,
                    chain: safeChain,
                    tx_hash,
                    new_balance: {
                        usdt: parseFloat(updatedBalance[0].usdt_balance).toFixed(4),
                        wld: parseFloat(updatedBalance[0].wld_balance).toFixed(4)
                    }
                }
            });

            processUplineDailyDividends(normalizedWalletAddr)
                .then(result => {
                    if (result.rewarded > 0) {
                        console.log(`[Deposit] ✅ 充值触发上级分红: ${result.rewarded} 人获得分红`);
                    }
                })
                .catch(err => {
                    console.error('[Deposit] ❌ 触发上级分红失败:', err.message);
                });
        } catch (error) {
            console.error('充值失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Deposit failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/deposits', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address is required'
                });
            }

            const rows = await dbQuery(
                'SELECT * FROM deposit_records WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?',
                [wallet_address.toLowerCase(), parseInt(limit)]
            );

            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('获取充值记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch deposit records',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.post('/withdraw', sensitiveLimiter, async (req, res) => {
        try {
            const { wallet_address, amount, fee, actual_amount, to_address } = req.body;

            if (!wallet_address || !amount || !to_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address, amount, and to_address are required'
                });
            }

            if (!isValidWalletAddress(wallet_address)) {
                recordSuspiciousActivity(req.ip, '提款：无效的钱包地址');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid wallet address format'
                });
            }

            if (!isValidWalletAddress(to_address)) {
                recordSuspiciousActivity(req.ip, '提款：无效的目标地址');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid destination address format'
                });
            }

            if (!isValidAmount(amount, 5, 100000)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount (minimum 5 USDT, maximum 100000 USDT)'
                });
            }

            const walletAddr = normalizeWalletAddress(wallet_address);
            const toAddr = normalizeWalletAddress(to_address);
            const withdrawAmount = parseFloat(amount);
            // SECURITY: fee/actual_amount are computed server-side only — never trust client values.
            const withdrawFee = withdrawAmount * 0.005;
            const actualAmount = withdrawAmount - withdrawFee;

            // Verify the account exists / not banned first, for accurate error messaging.
            const userBalance = await dbQuery(
                'SELECT usdt_balance, is_banned FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            if (userBalance.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (Number(userBalance[0].is_banned) === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended. Withdrawals are disabled. Please contact support.'
                });
            }

            // SECURITY: atomic conditional debit — prevents concurrent double-withdraw races.
            // Only one of N concurrent requests can satisfy `usdt_balance >= amount`.
            const debitResult = await dbQuery(
                'UPDATE user_balances SET usdt_balance = usdt_balance - ?, total_withdraw = total_withdraw + ?, updated_at = NOW() WHERE wallet_address = ? AND usdt_balance >= ? AND is_banned = 0',
                [withdrawAmount, withdrawAmount, walletAddr, withdrawAmount]
            );

            if (!debitResult || debitResult.affectedRows === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance',
                    data: {
                        current_balance: parseFloat(userBalance[0].usdt_balance).toFixed(4),
                        requested: withdrawAmount.toFixed(4)
                    }
                });
            }

            await dbQuery(
                'INSERT INTO withdraw_records (wallet_address, amount, fee, actual_amount, token, to_address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [walletAddr, withdrawAmount, withdrawFee, actualAmount, 'USDT', toAddr, 'pending']
            );

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            secureLog('提款申请', {
                wallet_address: walletAddr,
                amount: withdrawAmount,
                to_address: toAddr
            });

            res.json({
                success: true,
                message: 'Withdrawal request submitted',
                data: {
                    amount: withdrawAmount.toFixed(4),
                    fee: withdrawFee.toFixed(4),
                    actual_amount: actualAmount.toFixed(4),
                    new_balance: parseFloat(updatedBalance[0].usdt_balance).toFixed(4)
                }
            });
        } catch (error) {
            console.error('提款失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Withdrawal failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    router.get('/withdrawals', async (req, res) => {
        try {
            const { wallet_address, limit = 20 } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address is required'
                });
            }

            const rows = await dbQuery(
                'SELECT * FROM withdraw_records WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ?',
                [wallet_address.toLowerCase(), parseInt(limit)]
            );

            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('获取提款记录失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal records',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
