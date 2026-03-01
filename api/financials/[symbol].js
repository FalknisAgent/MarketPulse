const { getFinancials, isValidSymbol } = require('../_yahooFinance');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { symbol } = req.query;
    if (!symbol || !isValidSymbol(symbol)) {
        return res.status(400).json({ error: 'Invalid stock symbol' });
    }
    try {
        const financials = await getFinancials(symbol);
        res.json(financials);
    } catch (error) {
        console.error('Financials error:', error.message);
        if (error.message.includes('not found') || error.message.includes('No results')) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.status(500).json({ error: 'Failed to fetch financials' });
    }
};
