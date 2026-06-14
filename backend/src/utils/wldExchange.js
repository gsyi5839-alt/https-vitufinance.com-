export function createWldExchangeTools(dbQuery) {
    let schemaReady = false;

    async function ensureWldExchangeSchema() {
        if (schemaReady) return;

        try {
            await dbQuery(
                `CREATE TABLE IF NOT EXISTS wld_exchange_records (
                    id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                    wallet_address VARCHAR(42) NOT NULL,
                    direction ENUM('wld_to_usdt','usdt_to_wld') DEFAULT NULL,
                    usdt_amount DECIMAL(20,4) NOT NULL,
                    wld_amount DECIMAL(20,4) NOT NULL,
                    price DECIMAL(20,8) DEFAULT NULL,
                    exchange_rate DECIMAL(20,8) DEFAULT NULL,
                    status ENUM('pending','completed','failed') DEFAULT 'completed',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_wallet_address (wallet_address),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='WLD exchange records (auto-migrated)';`
            );

            const cols = await dbQuery('SHOW COLUMNS FROM wld_exchange_records');
            const colSet = new Set((cols || []).map(c => c.Field));

            if (!colSet.has('direction')) {
                await dbQuery(`ALTER TABLE wld_exchange_records ADD COLUMN direction ENUM('wld_to_usdt','usdt_to_wld') DEFAULT NULL AFTER wallet_address`);
            }
            if (!colSet.has('price')) {
                await dbQuery(`ALTER TABLE wld_exchange_records ADD COLUMN price DECIMAL(20,8) DEFAULT NULL AFTER wld_amount`);
            }
            if (!colSet.has('exchange_rate')) {
                await dbQuery(`ALTER TABLE wld_exchange_records ADD COLUMN exchange_rate DECIMAL(20,8) DEFAULT NULL AFTER price`);
            }
            if (!colSet.has('status')) {
                await dbQuery(`ALTER TABLE wld_exchange_records ADD COLUMN status ENUM('pending','completed','failed') DEFAULT 'completed' AFTER exchange_rate`);
            }
            if (!colSet.has('created_at')) {
                await dbQuery(`ALTER TABLE wld_exchange_records ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
            }

            schemaReady = true;
        } catch (error) {
            console.error('[Exchange] ensureWldExchangeSchema failed:', error.message);
        }
    }

    async function fetchWldPriceFromBinance() {
        if (typeof fetch !== 'function') {
            throw new Error('fetch is not available in this Node.js runtime');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            const resp = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=WLDUSDT', {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller.signal
            });

            if (!resp.ok) {
                throw new Error(`Binance HTTP ${resp.status}`);
            }

            const json = await resp.json();
            const price = Number(json?.price);

            if (!Number.isFinite(price) || price <= 0) {
                throw new Error('Invalid Binance price payload');
            }

            return price;
        } finally {
            clearTimeout(timeout);
        }
    }

    return {
        ensureWldExchangeSchema,
        fetchWldPriceFromBinance
    };
}
