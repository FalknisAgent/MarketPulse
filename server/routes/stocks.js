const express = require('express');
const router = express.Router();
const yahooFinance = require('../services/yahooFinance');

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
router.get('/quote/:symbol', async (req, res) => {
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
router.get('/historical/:symbol', async (req, res) => {
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
router.get('/financials/:symbol', async (req, res) => {
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
router.get('/full/:symbol', async (req, res) => {
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
