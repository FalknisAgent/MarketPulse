const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({
    validation: { logErrors: false, logOptionsErrors: false, allowAdditionalProps: true }
});

const NO_VALIDATE = { validateResult: false };

// Supported currencies and their Yahoo Finance FX ticker format
const SUPPORTED = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 's-maxage=600'); // Cache 10 mins at CDN level
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

    // Same currency — no conversion needed
    if (from === to) {
        return res.json({ from, to, rate: 1, timestamp: new Date().toISOString() });
    }

    try {
        const ticker = `${from}${to}=X`;
        const quote = await yahooFinance.quote(ticker, {}, NO_VALIDATE);
        const rate = quote.regularMarketPrice;
        if (!rate || isNaN(rate)) throw new Error('No rate returned');

        return res.json({ from, to, rate, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error(`FX rate error (${pair}):`, error.message);
        return res.status(500).json({ error: `Failed to fetch exchange rate for ${pair}` });
    }
};
