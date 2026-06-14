import express from 'express';
import { createHash } from 'node:crypto';

const SAFE_PASSWORD_SALT = 'vitu_safe_salt';

const TOKEN_FIELDS = {
    USDT: { balanceField: 'usdt_balance', lockedField: 'locked_usdt' },
    WLD: { balanceField: 'wld_balance', lockedField: 'locked_wld' }
};

export async function initSafeTable(dbQuery) {
    try {
        await dbQuery(`
            CREATE TABLE IF NOT EXISTS user_safes (
                id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                wallet_address VARCHAR(100) NOT NULL COMMENT '钱包地址',
                password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
                locked_usdt DECIMAL(20, 4) DEFAULT 0 COMMENT '锁定的USDT',
                locked_wld DECIMAL(20, 4) DEFAULT 0 COMMENT '锁定的WLD',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uk_wallet (wallet_address)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户保险箱'
        `);
        console.log('[DB] 保险箱表初始化完成');
    } catch (error) {
        console.error('[DB] 保险箱表初始化失败:', error.message);
    }
}

function hashPassword(password) {
    return createHash('sha256').update(password + SAFE_PASSWORD_SALT).digest('hex');
}

function getTokenConfig(token) {
    return TOKEN_FIELDS[String(token || 'USDT').toUpperCase()] || null;
}

function formatSafeRow(row) {
    return {
        locked_usdt: parseFloat(row.locked_usdt).toFixed(4),
        locked_wld: parseFloat(row.locked_wld).toFixed(4)
    };
}

function formatBalanceRow(row) {
    return {
        usdt: parseFloat(row.usdt_balance).toFixed(4),
        wld: parseFloat(row.wld_balance).toFixed(4)
    };
}

async function verifySafePassword(dbQuery, walletAddr, password, fields = 'password_hash') {
    const safe = await dbQuery(
        `SELECT ${fields} FROM user_safes WHERE wallet_address = ?`,
        [walletAddr]
    );

    if (safe.length === 0) {
        return { error: { status: 404, message: 'Safe not found' } };
    }

    if (hashPassword(password) !== safe[0].password_hash) {
        return { error: { status: 401, message: 'Invalid password' } };
    }

    return { safe: safe[0] };
}

export function createSafeRoutes({ dbQuery }) {
    const router = express.Router();

    router.get('/status', async (req, res) => {
        try {
            const { wallet_address } = req.query;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address is required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const safe = await dbQuery(
                'SELECT locked_usdt, locked_wld FROM user_safes WHERE wallet_address = ?',
                [walletAddr]
            );

            if (safe.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        has_safe: false,
                        locked_usdt: '0.0000',
                        locked_wld: '0.0000'
                    }
                });
            }

            res.json({
                success: true,
                data: {
                    has_safe: true,
                    ...formatSafeRow(safe[0])
                }
            });
        } catch (error) {
            console.error('获取保险箱状态失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get safe status'
            });
        }
    });

    router.post('/setup', async (req, res) => {
        try {
            const { wallet_address, password } = req.body;

            if (!wallet_address || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and password are required'
                });
            }

            if (password.length !== 6 || !/^\d+$/.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be 6 digits'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const existing = await dbQuery(
                'SELECT id FROM user_safes WHERE wallet_address = ?',
                [walletAddr]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Safe already exists'
                });
            }

            await dbQuery(
                'INSERT INTO user_safes (wallet_address, password_hash) VALUES (?, ?)',
                [walletAddr, hashPassword(password)]
            );

            res.json({
                success: true,
                message: 'Safe created successfully'
            });
        } catch (error) {
            console.error('创建保险箱失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to create safe'
            });
        }
    });

    router.post('/verify', async (req, res) => {
        try {
            const { wallet_address, password } = req.body;

            if (!wallet_address || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address and password are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const { safe, error } = await verifySafePassword(
                dbQuery,
                walletAddr,
                password,
                'password_hash, locked_usdt, locked_wld'
            );

            if (error) {
                return res.status(error.status).json({ success: false, message: error.message });
            }

            res.json({
                success: true,
                message: 'Password verified',
                data: formatSafeRow(safe)
            });
        } catch (error) {
            console.error('验证保险箱密码失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to verify password'
            });
        }
    });

    router.post('/deposit', async (req, res) => {
        try {
            const { wallet_address, password, amount, token = 'USDT' } = req.body;

            if (!wallet_address || !password || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address, password and amount are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const depositAmount = parseFloat(amount);

            if (isNaN(depositAmount) || depositAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            const { error } = await verifySafePassword(dbQuery, walletAddr, password);
            if (error) {
                return res.status(error.status).json({ success: false, message: error.message });
            }

            const tokenConfig = getTokenConfig(token);
            if (!tokenConfig) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token type'
                });
            }

            const { balanceField, lockedField } = tokenConfig;
            const balance = await dbQuery(
                'SELECT usdt_balance, wld_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );

            if (balance.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Balance record not found'
                });
            }

            if (parseFloat(balance[0][balanceField] ?? 0) < depositAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient balance'
                });
            }

            await dbQuery(
                `UPDATE user_balances SET ${balanceField} = ${balanceField} - ? WHERE wallet_address = ?`,
                [depositAmount, walletAddr]
            );
            await dbQuery(
                `UPDATE user_safes SET ${lockedField} = ${lockedField} + ? WHERE wallet_address = ?`,
                [depositAmount, walletAddr]
            );

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance, wld_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            const updatedSafe = await dbQuery(
                'SELECT locked_usdt, locked_wld FROM user_safes WHERE wallet_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                message: 'Deposit successful',
                data: {
                    balance: formatBalanceRow(updatedBalance[0]),
                    safe: formatSafeRow(updatedSafe[0])
                }
            });
        } catch (error) {
            console.error('保险箱存款失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to deposit'
            });
        }
    });

    router.post('/withdraw', async (req, res) => {
        try {
            const { wallet_address, password, amount, token = 'USDT' } = req.body;

            if (!wallet_address || !password || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'wallet_address, password and amount are required'
                });
            }

            const walletAddr = wallet_address.toLowerCase();
            const withdrawAmount = parseFloat(amount);

            if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            const banRows = await dbQuery(
                'SELECT is_banned FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            if (banRows.length > 0 && Number(banRows[0].is_banned) === 1) {
                return res.status(403).json({
                    success: false,
                    message: 'Your account has been suspended. Withdrawals are disabled. Please contact support.'
                });
            }

            const { safe, error } = await verifySafePassword(
                dbQuery,
                walletAddr,
                password,
                'password_hash, locked_usdt, locked_wld'
            );

            if (error) {
                return res.status(error.status).json({ success: false, message: error.message });
            }

            const tokenUpper = String(token || 'USDT').toUpperCase();
            const tokenConfig = getTokenConfig(tokenUpper);
            if (!tokenConfig) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token type'
                });
            }

            const { balanceField, lockedField } = tokenConfig;
            const lockedBalance = tokenUpper === 'WLD'
                ? parseFloat(safe.locked_wld)
                : parseFloat(safe.locked_usdt);

            if (lockedBalance < withdrawAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient locked balance'
                });
            }

            await dbQuery(
                `UPDATE user_safes SET ${lockedField} = ${lockedField} - ? WHERE wallet_address = ?`,
                [withdrawAmount, walletAddr]
            );
            await dbQuery(
                'INSERT IGNORE INTO user_balances (wallet_address, usdt_balance, wld_balance, total_deposit, total_withdraw, created_at, updated_at) VALUES (?, 0, 0, 0, 0, NOW(), NOW())',
                [walletAddr]
            );
            await dbQuery(
                `UPDATE user_balances SET ${balanceField} = ${balanceField} + ? WHERE wallet_address = ?`,
                [withdrawAmount, walletAddr]
            );

            const updatedBalance = await dbQuery(
                'SELECT usdt_balance, wld_balance FROM user_balances WHERE wallet_address = ?',
                [walletAddr]
            );
            const updatedSafe = await dbQuery(
                'SELECT locked_usdt, locked_wld FROM user_safes WHERE wallet_address = ?',
                [walletAddr]
            );

            res.json({
                success: true,
                message: 'Withdraw successful',
                data: {
                    balance: formatBalanceRow(updatedBalance[0]),
                    safe: formatSafeRow(updatedSafe[0])
                }
            });
        } catch (error) {
            console.error('保险箱取款失败:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to withdraw'
            });
        }
    });

    return router;
}
