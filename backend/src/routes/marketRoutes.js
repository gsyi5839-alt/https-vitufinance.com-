import express from 'express';
import axios from 'axios';

const router = express.Router();

// Reads the raw query string because the global input sanitizer escapes quotes
// and breaks JSON array parsing for Binance's symbols parameter.
router.get('/ticker', async (req, res) => {
    try {
        const queryIndex = req.url.indexOf('?');
        const queryString = queryIndex >= 0 ? req.url.slice(queryIndex + 1) : '';
        const symbolsMatch = queryString.match(/symbols=([^&]*)/);

        if (!symbolsMatch) {
            return res.status(400).json({
                success: false,
                message: 'symbols parameter is required'
            });
        }

        const rawSymbols = decodeURIComponent(symbolsMatch[1]);
        let symbolsArray;

        try {
            symbolsArray = JSON.parse(rawSymbols);
        } catch {
            symbolsArray = [rawSymbols];
        }

        if (!Array.isArray(symbolsArray) || symbolsArray.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid symbols format'
            });
        }

        const validSymbolRegex = /^[A-Z0-9]+$/;
        for (const symbol of symbolsArray) {
            if (!validSymbolRegex.test(symbol)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid symbol format'
                });
            }
        }

        const encodedSymbols = encodeURIComponent(JSON.stringify(symbolsArray));
        const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodedSymbols}`;
        const response = await axios.get(binanceUrl);

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching ticker data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticker data',
            error: error.message
        });
    }
});

router.get('/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol, interval, limit }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching kline data:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch kline data'
        });
    }
});

export default router;
