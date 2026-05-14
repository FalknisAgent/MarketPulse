const { getFxRate } = require('../_yahooFinance');

// Supported currencies and their Yahoo Finance FX ticker format
const SUPPORTED = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    // Removed long CDN cache to allow instant updates; rely on 5m server cache
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { pair } = req.query; // e.g. "USDEUR" or "CHFEUR"
    if (!pair || pair.length !== 6) {
        return res.status(400).json({ error: 'Invalid currency pair. Expected format: USDEUR' });
    }

    const from = pair.slice(0, 3).toUpperCase();
    const to = pair.slice(3, 6).toUpperCase();

    if (!SUPPORTED.includes(from) || !SUPPORTED.includes(to)) {
        return res.status(400).json({ error: `Unsupported currency. Supported: ${SUPPORTED.join(', ')}` });
    }

    try {
        const rate = await getFxRate(pair);
        return res.json({ from, to, rate, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error(`FX rate error (${pair}):`, error.message);
        return res.status(500).json({ error: `Failed to fetch exchange rate for ${pair}` });
    }
};
