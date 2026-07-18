import express from 'express';

const DEFAULT_WALLETS = {
    BSC: {
        address: '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4',
        chainId: '0x38',
        chainName: 'BNB Smart Chain',
        token: 'USDT',
        tokenContract: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        tokens: {
            USDT: {
                tokenContract: '0x55d398326f99059fF775485246999027B3197955',
                decimals: 18
            }
        },
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        explorer: 'https://bscscan.com/'
    },
    ETH: {
        address: '0x8a92c73FdE5d0313303989eB269d6d17ffb1ba9d',
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        token: 'USDT',
        tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        tokens: {
            USDT: {
                tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                decimals: 6
            },
            USDC: {
                tokenContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 6
            }
        },
        rpcUrl: 'https://ethereum-rpc.publicnode.com',
        explorer: 'https://etherscan.io/'
    }
};

const DEFAULT_DOCUMENTS = {
    whitepaper_url: '/static/documents/whitepaper',
    whitepaper_type: 'gallery',
    whitepaper_pages: 26,
    msb_url: '/static/documents/MSB.png',
    msb_type: 'image',
    business_license_url: '/static/documents/license.png',
    business_license_type: 'image'
};

function settingsToObject(settings) {
    const config = {};
    settings.forEach((setting) => {
        config[setting.setting_key] = setting.setting_value;
    });
    return config;
}

function cloneDefaultWallets() {
    return JSON.parse(JSON.stringify(DEFAULT_WALLETS));
}

function detectTypeFromUrl(url) {
    if (!url) return 'image';
    const ext = url.toLowerCase().split('.').pop();
    return ext === 'pdf' ? 'pdf' : 'image';
}

export function createPlatformRoutes({ dbQuery, defaultWalletAddress, getPageTotalAmount }) {
    const router = express.Router();

    router.get('/wallet', async (req, res) => {
        try {
            const settings = await dbQuery(
                "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'platform_wallet_%' OR setting_key IN ('platform_network', 'platform_token')"
            );
            const config = settingsToObject(settings);
            const wallets = cloneDefaultWallets();

            if (config.platform_wallet_bsc) {
                wallets.BSC.address = config.platform_wallet_bsc;
            }
            if (config.platform_wallet_eth) {
                wallets.ETH.address = config.platform_wallet_eth;
            }

            res.json({
                success: true,
                data: {
                    address: config.platform_wallet_address || wallets.BSC.address,
                    network: config.platform_network || 'BSC',
                    token: config.platform_token || 'USDT',
                    wallets,
                    supportedChains: ['BSC', 'ETH']
                }
            });
        } catch (error) {
            console.error('获取平台收款地址失败:', error.message);
            const wallets = cloneDefaultWallets();

            res.json({
                success: true,
                data: {
                    address: defaultWalletAddress,
                    network: 'BSC',
                    token: 'USDT',
                    wallets,
                    supportedChains: ['BSC', 'ETH']
                }
            });
        }
    });

    router.get('/documents', async (req, res) => {
        try {
            const settings = await dbQuery(
                `SELECT setting_key, setting_value FROM system_settings
                 WHERE setting_key IN (
                   'doc_whitepaper_url', 'doc_whitepaper_type', 'doc_whitepaper_pages',
                   'doc_msb_url', 'doc_msb_type',
                   'doc_business_license_url', 'doc_business_license_type'
                 )`
            );
            const config = settingsToObject(settings);

            res.json({
                success: true,
                data: {
                    whitepaper_url: config.doc_whitepaper_url || DEFAULT_DOCUMENTS.whitepaper_url,
                    whitepaper_type: config.doc_whitepaper_type || detectTypeFromUrl(config.doc_whitepaper_url || DEFAULT_DOCUMENTS.whitepaper_url),
                    whitepaper_pages: parseInt(config.doc_whitepaper_pages) || DEFAULT_DOCUMENTS.whitepaper_pages,
                    msb_url: config.doc_msb_url || DEFAULT_DOCUMENTS.msb_url,
                    msb_type: config.doc_msb_type || detectTypeFromUrl(config.doc_msb_url || DEFAULT_DOCUMENTS.msb_url),
                    business_license_url: config.doc_business_license_url || DEFAULT_DOCUMENTS.business_license_url,
                    business_license_type: config.doc_business_license_type || detectTypeFromUrl(config.doc_business_license_url || DEFAULT_DOCUMENTS.business_license_url)
                }
            });
        } catch (error) {
            console.error('获取资质文件配置失败:', error.message);
            res.json({
                success: true,
                data: DEFAULT_DOCUMENTS
            });
        }
    });

    router.get('/total-investments', async (req, res) => {
        try {
            const followResult = await getPageTotalAmount('follow');
            const robotResult = await getPageTotalAmount('robot');

            if (!followResult.success || !robotResult.success) {
                throw new Error('获取页面总金额失败');
            }

            res.json({
                success: true,
                data: {
                    follow_page_total: followResult.data.total_amount,
                    follow_simulated: followResult.data.total_simulated,
                    follow_real: followResult.data.real_user_investment,
                    robot_page_total: robotResult.data.total_amount,
                    robot_simulated: robotResult.data.total_simulated,
                    robot_real: robotResult.data.real_user_investment,
                    breakdown: {
                        follow: {
                            total: followResult.data.total_amount,
                            simulated_base: followResult.data.simulated_base,
                            simulated_growth: followResult.data.simulated_growth,
                            real_user: followResult.data.real_user_investment
                        },
                        robot: {
                            total: robotResult.data.total_amount,
                            simulated_base: robotResult.data.simulated_base,
                            simulated_growth: robotResult.data.simulated_growth,
                            real_user: robotResult.data.real_user_investment
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[API] Get total investments error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch total investments',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
}
