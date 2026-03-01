const { getHistoricalData, isValidSymbol } = require('../_yahooFinance');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { symbol } = req.query;
    const period = req.query.period || 'max';

    if (!symbol || !isValidSymbol(symbol)) {
        return res.status(400).json({ error: 'Invalid stock symbol' });
    }
    const validPeriods = ['1m', '3m', '6m', '1y', '5y', '10y', 'max'];
    if (!validPeriods.includes(period)) {
        return res.status(400).json({ error: 'Invalid period. Use: 1m, 3m, 6m, 1y, 5y, 10y, or max' });
    }
    try {
        const data = await getHistoricalData(symbol, period);
        res.json(data);
    } catch (error) {
        console.error('Historical data error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch historical data' });
    }
};
