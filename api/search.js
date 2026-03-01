const { searchStocks } = require('./_yahooFinance');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const query = req.query.q;
    if (!query || query.trim().length < 1) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    try {
        const results = await searchStocks(query);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ error: 'Failed to search stocks' });
    }
};
