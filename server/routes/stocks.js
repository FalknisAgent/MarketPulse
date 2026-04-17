const express = require('express');
const router = express.Router();
const yahooFinance = require('../services/yahooFinance');

// Central Memory Store: IP Address -> Set of Symbols
const guestLookups = new Map();
const MAX_FREE_STOCKS = 3;

/**
 * Middleware: Check if guest IP has exceeded 3 unique stocks
 */
const guestLimitCheck = (req, res, next) => {
    // If a valid Authorization header is provided, skip the limit (assuming they are authenticated)
    if (req.headers.authorization) {
        return next();
    }

    // Identify standard request parameters that contain symbols
    const symbol = req.params.symbol || req.query.q;
    if (!symbol) return next();

    const cleanSymbol = symbol.toUpperCase().trim();
    const clientIp = req.ip || req.connection.remoteAddress;

    // Initialize tracking for this IP
    if (!guestLookups.has(clientIp)) {
        guestLookups.set(clientIp, new Set());
    }

    const userSet = guestLookups.get(clientIp);

    // If they already hit the limit and are trying a NEW symbol, block it.
    if (userSet.size >= MAX_FREE_STOCKS && !userSet.has(cleanSymbol)) {
        return res.status(403).json({
            error: 'GUEST_LIMIT_REACHED',
            message: 'You have exhausted your 3 free stock checks.'
        });
    }

    // Only add if we haven't blocked it
    userSet.add(cleanSymbol);
    next();
};

/**
 * GET /api/search?q=query
 * Search for stocks by name or symbol
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || query.trim().length < 1) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const results = await yahooFinance.searchStocks(query);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ error: 'Failed to search stocks' });
    }
});

/**
 * GET /api/quote/:symbol
 * Get current quote for a stock
 */
router.get('/quote/:symbol', guestLimitCheck, async (req, res) => {
    try {
        const { symbol } = req.params;

        if (!yahooFinance.isValidSymbol(symbol)) {
            return res.status(400).json({ error: 'Invalid stock symbol' });
        }

        const quote = await yahooFinance.getQuote(symbol);
        res.json(quote);
    } catch (error) {
        console.error('Quote error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch quote' });
    }
});

/**
 * GET /api/historical/:symbol?period=1y
 * Get historical price data
 */
router.get('/historical/:symbol', guestLimitCheck, async (req, res) => {
    try {
        const { symbol } = req.params;
        const period = req.query.period || 'max';

        if (!yahooFinance.isValidSymbol(symbol)) {
            return res.status(400).json({ error: 'Invalid stock symbol' });
        }

        const validPeriods = ['1m', '3m', '6m', '1y', '5y', '10y', 'max'];
        if (!validPeriods.includes(period)) {
            return res.status(400).json({ error: 'Invalid period. Use: 1m, 3m, 6m, 1y, 5y, 10y, or max' });
        }

        const data = await yahooFinance.getHistoricalData(symbol, period);
        res.json(data);
    } catch (error) {
        console.error('Historical data error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
});

/**
 * GET /api/financials/:symbol
 * Get financial statements and metrics
 */
router.get('/financials/:symbol', guestLimitCheck, async (req, res) => {
    try {
        const { symbol } = req.params;

        if (!yahooFinance.isValidSymbol(symbol)) {
            return res.status(400).json({ error: 'Invalid stock symbol' });
        }

        const financials = await yahooFinance.getFinancials(symbol);
        res.json(financials);
    } catch (error) {
        console.error('Financials error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch financials' });
    }
});

/**
 * GET /api/full/:symbol
 * Get all data for a stock (quote + financials + historical)
 */
router.get('/full/:symbol', guestLimitCheck, async (req, res) => {
    try {
        const { symbol } = req.params;

        if (!yahooFinance.isValidSymbol(symbol)) {
            return res.status(400).json({ error: 'Invalid stock symbol' });
        }

        // Fetch all data in parallel
        const [quote, financials, historical] = await Promise.all([
            yahooFinance.getQuote(symbol),
            yahooFinance.getFinancials(symbol),
            yahooFinance.getHistoricalData(symbol, 'max')
        ]);

        res.json({
            quote,
            financials,
            historical
        });
    } catch (error) {
        console.error('Full data error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

module.exports = router;
