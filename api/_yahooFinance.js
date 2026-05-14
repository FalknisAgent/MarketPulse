const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({
    validation: {
        logErrors: false,
        logOptionsErrors: false,
        allowAdditionalProps: true
    }
});

// Options passed to every yahoo-finance2 call to skip schema validation
// (non-US stocks like SIKA.SW return extra/unexpected fields that fail validation)
const NO_VALIDATE = { validateResult: false };

// ── Simple in-memory cache for Vercel warm instances ──
// Vercel serverless functions are ephemeral, but warm instances reuse the
// module scope. This cache helps when a user hits the same stock rapidly.
const _cache = new Map();
const CACHE_TTL = {
    QUOTE: 5 * 60 * 1000,
    FINANCIALS: 30 * 60 * 1000,
    HISTORICAL: 15 * 60 * 1000,
    SEARCH: 10 * 60 * 1000
};

function cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
    return entry.value;
}

function cacheSet(key, value, ttlMs) {
    // Cap cache size to prevent memory leaks in long-lived warm instances
    if (_cache.size > 200) {
        const oldest = _cache.keys().next().value;
        _cache.delete(oldest);
    }
    _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const isValidSymbol = (symbol) => {
    return /^[A-Z0-9.-]{1,10}$/.test(symbol.toUpperCase());
};

const sanitizeSymbol = (symbol) => {
    return symbol.toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10);
};

async function getQuote(symbol) {
    const sanitized = sanitizeSymbol(symbol);
    if (!isValidSymbol(sanitized)) throw new Error('Invalid symbol format');

    const ck = `quote:${sanitized}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const quote = await yahooFinance.quote(sanitized, {}, NO_VALIDATE);
    const result = {
        symbol: quote.symbol,
        shortName: quote.shortName || quote.longName,
        longName: quote.longName,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        previousClose: quote.regularMarketPreviousClose,
        open: quote.regularMarketOpen,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        avgVolume: quote.averageDailyVolume10Day,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        forwardPE: quote.forwardPE,
        eps: quote.epsTrailingTwelveMonths,
        dividendYield: quote.dividendYield,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        fiftyDayAverage: quote.fiftyDayAverage,
        twoHundredDayAverage: quote.twoHundredDayAverage,
        exchange: quote.exchange,
        currency: quote.currency,
        quoteType: quote.quoteType
    };
    cacheSet(ck, result, CACHE_TTL.QUOTE);
    return result;
}

async function getHistoricalData(symbol, period = 'max') {
    const sanitized = sanitizeSymbol(symbol);
    if (!isValidSymbol(sanitized)) throw new Error('Invalid symbol format');

    const ck = `historical:${sanitized}:${period}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const now = new Date();
    const getMonthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
    const getYearsAgo = (n) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return d; };

    const periodMap = {
        '1m': { period1: getMonthsAgo(1), period2: now },
        '3m': { period1: getMonthsAgo(3), period2: now },
        '6m': { period1: getMonthsAgo(6), period2: now },
        '1y': { period1: getYearsAgo(1), period2: now },
        '5y': { period1: getYearsAgo(5), period2: now },
        '10y': { period1: getYearsAgo(10), period2: now },
        'max': { period1: new Date('1970-01-01'), period2: now }
    };
    const dateRange = periodMap[period] || periodMap['max'];
    const result = await yahooFinance.chart(sanitized, {
        period1: dateRange.period1,
        period2: dateRange.period2,
        interval: period === '1m' ? '1d' : '1wk'
    }, NO_VALIDATE);

    const data = {
        symbol: sanitized,
        quotes: result.quotes.map(q => ({
            date: q.date, open: q.open, high: q.high,
            low: q.low, close: q.close, volume: q.volume
        }))
    };
    cacheSet(ck, data, CACHE_TTL.HISTORICAL);
    return data;
}

async function getFinancials(symbol) {
    const sanitized = sanitizeSymbol(symbol);
    if (!isValidSymbol(sanitized)) throw new Error('Invalid symbol format');

    const ck = `financials:${sanitized}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const allModules = [
        'financialData', 'defaultKeyStatistics', 'assetProfile', 'summaryDetail',
        'incomeStatementHistory', 'incomeStatementHistoryQuarterly',
        'balanceSheetHistory', 'balanceSheetHistoryQuarterly',
        'cashflowStatementHistory', 'cashflowStatementHistoryQuarterly',
        'earnings', 'earningsHistory', 'earningsTrend', 'recommendationTrend'
    ];

    // Batch: single quoteSummary call with all modules + fundamentalsTimeSeries in parallel
    const [batchedResult, fundamentals] = await Promise.all([
        yahooFinance.quoteSummary(sanitized, { modules: allModules }, NO_VALIDATE)
            .catch(async () => {
                // Fallback: if batched call fails, try individual modules
                console.warn(`Batched quoteSummary failed for ${sanitized}, falling back to individual modules`);
                const results = await Promise.all(allModules.map(module =>
                    yahooFinance.quoteSummary(sanitized, { modules: [module] }, NO_VALIDATE)
                        .catch(() => null)
                ));
                const merged = {};
                results.forEach(res => { if (res) Object.assign(merged, res); });
                return merged;
            }),
        yahooFinance.fundamentalsTimeSeries(sanitized, {
            period1: (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 10); return d; })(),
            period2: new Date(),
            module: 'all'
        }, NO_VALIDATE).catch(() => null)
    ]);

    const fullSummary = batchedResult || {};

    const data = {
        symbol: sanitized,
        financialData: fullSummary.financialData || {},
        keyStatistics: fullSummary.defaultKeyStatistics || {},
        incomeStatements: fullSummary.incomeStatementHistory?.incomeStatementHistory || [],
        incomeStatementsQuarterly: fullSummary.incomeStatementHistoryQuarterly?.incomeStatementHistory || [],
        balanceSheets: fullSummary.balanceSheetHistory?.balanceSheetStatements || [],
        balanceSheetsQuarterly: fullSummary.balanceSheetHistoryQuarterly?.balanceSheetStatements || [],
        cashFlows: fullSummary.cashflowStatementHistory?.cashflowStatements || [],
        cashFlowsQuarterly: fullSummary.cashflowStatementHistoryQuarterly?.cashflowStatements || [],
        earnings: fullSummary.earnings || {},
        earningsHistory: fullSummary.earningsHistory?.history || [],
        earningsTrend: fullSummary.earningsTrend?.trend || [],
        recommendations: fullSummary.recommendationTrend?.trend || [],
        fundamentalsTimeSeries: fundamentals
    };
    cacheSet(ck, data, CACHE_TTL.FINANCIALS);
    return data;
}

async function searchStocks(query) {
    const sanitizedQuery = query.replace(/[<>"'&]/g, '').slice(0, 50);

    const ck = `search:${sanitizedQuery.toLowerCase()}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const results = await yahooFinance.search(sanitizedQuery, { quotesCount: 10, newsCount: 0 }, NO_VALIDATE);
    const data = results.quotes
        .filter(q => q.quoteType === 'EQUITY')
        .map(q => ({
            symbol: q.symbol,
            shortName: q.shortName || q.shortname || q.longName || q.longname || q.symbol,
            longName: q.longName || q.longname || q.shortName || q.shortname || q.symbol,
            exchange: q.exchange,
            quoteType: q.quoteType
        }));
    cacheSet(ck, data, CACHE_TTL.SEARCH);
    return data;
}

async function getFxRate(pair) {
    const from = pair.slice(0, 3).toUpperCase();
    const to = pair.slice(3, 6).toUpperCase();
    if (from === to) return 1;

    const ck = `fx:${from}${to}`;
    const cached = cacheGet(ck);
    if (cached) return cached;

    const ticker = `${from}${to}=X`;
    const quote = await yahooFinance.quote(ticker, {}, NO_VALIDATE);
    const rate = quote.regularMarketPrice;
    if (!rate || isNaN(rate)) throw new Error('No rate returned');

    cacheSet(ck, rate, CACHE_TTL.QUOTE);
    return rate;
}

module.exports = { getQuote, getHistoricalData, getFinancials, searchStocks, getFxRate, isValidSymbol };
