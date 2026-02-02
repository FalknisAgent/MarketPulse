const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({
    validation: {
        logErrors: false,
        logOptionsErrors: false,
        allowAdditionalProps: true
    }
});

// Validate stock symbol format (1-10 characters: letters, numbers, dots, dashes)
const isValidSymbol = (symbol) => {
    return /^[A-Z0-9.-]{1,10}$/.test(symbol.toUpperCase());
};

// Sanitize symbol
const sanitizeSymbol = (symbol) => {
    return symbol.toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10);
};

/**
 * Get real-time quote for a stock
 */
async function getQuote(symbol) {
    try {
        const sanitized = sanitizeSymbol(symbol);
        if (!isValidSymbol(sanitized)) {
            throw new Error('Invalid symbol format');
        }

        const quote = await yahooFinance.quote(sanitized);
        return {
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
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Get historical price data
 */
async function getHistoricalData(symbol, period = 'max') {
    try {
        const sanitized = sanitizeSymbol(symbol);
        if (!isValidSymbol(sanitized)) {
            throw new Error('Invalid symbol format');
        }

        const periodMap = {
            '1m': { period1: getDateNMonthsAgo(1), period2: new Date() },
            '3m': { period1: getDateNMonthsAgo(3), period2: new Date() },
            '6m': { period1: getDateNMonthsAgo(6), period2: new Date() },
            '1y': { period1: getDateNYearsAgo(1), period2: new Date() },
            '5y': { period1: getDateNYearsAgo(5), period2: new Date() },
            '10y': { period1: getDateNYearsAgo(10), period2: new Date() },
            'max': { period1: new Date('1970-01-01'), period2: new Date() }
        };

        const dateRange = periodMap[period] || periodMap['max'];

        const result = await yahooFinance.chart(sanitized, {
            period1: dateRange.period1,
            period2: dateRange.period2,
            interval: period === '1m' ? '1d' : '1wk'
        });

        return {
            symbol: sanitized,
            quotes: result.quotes.map(q => ({
                date: q.date,
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
                volume: q.volume
            }))
        };
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Get financial statements and key metrics
 */
async function getFinancials(symbol) {
    try {
        const sanitized = sanitizeSymbol(symbol);
        if (!isValidSymbol(sanitized)) {
            throw new Error('Invalid symbol format');
        }

        // All possible modules we want
        const allModules = [
            'financialData',
            'defaultKeyStatistics',
            'assetProfile',
            'summaryDetail',
            'incomeStatementHistory',
            'incomeStatementHistoryQuarterly',
            'balanceSheetHistory',
            'balanceSheetHistoryQuarterly',
            'cashflowStatementHistory',
            'cashflowStatementHistoryQuarterly',
            'earnings',
            'earningsHistory',
            'earningsTrend',
            'recommendationTrend'
        ];

        // Fetch each module individually to be super resilient
        const results = await Promise.all(allModules.map(module =>
            yahooFinance.quoteSummary(sanitized, { modules: [module] })
                .catch(err => {
                    // Ignore errors for individual modules
                    console.warn(`Module ${module} failed for ${symbol}:`, err.message);
                    return null;
                })
        ));

        // Merge results
        const fullSummary = {};
        results.forEach(res => {
            if (res) Object.assign(fullSummary, res);
        });

        // Fetch fundamentals (historical)
        const fundamentals = await yahooFinance.fundamentalsTimeSeries(sanitized, {
            period1: getDateNYearsAgo(10),
            period2: new Date(),
            module: 'all'
        }).catch(err => {
            console.warn(`FundamentalsTimeSeries failed for ${symbol}:`, err.message);
            return null;
        });

        return {
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
    } catch (error) {
        console.error(`Error fetching financials for ${symbol}:`, error.message);
        throw error;
    }
}

/**
 * Search for stocks
 */
async function searchStocks(query) {
    try {
        const sanitizedQuery = query.replace(/[<>\"'&]/g, '').slice(0, 50);

        const results = await yahooFinance.search(sanitizedQuery, {
            quotesCount: 10,
            newsCount: 0
        });

        return results.quotes
            .filter(q => q.quoteType === 'EQUITY')
            .map(q => ({
                symbol: q.symbol,
                shortName: q.shortName || q.shortname || q.longName || q.longname || q.symbol,
                longName: q.longName || q.longname || q.shortName || q.shortname || q.symbol,
                exchange: q.exchange,
                quoteType: q.quoteType
            }));
    } catch (error) {
        console.error(`Error searching for ${query}:`, error.message);
        throw error;
    }
}

// Helper functions
function getDateNMonthsAgo(n) {
    const date = new Date();
    date.setMonth(date.getMonth() - n);
    return date;
}

function getDateNYearsAgo(n) {
    const date = new Date();
    date.setFullYear(date.getFullYear() - n);
    return date;
}

module.exports = {
    getQuote,
    getHistoricalData,
    getFinancials,
    searchStocks,
    isValidSymbol,
    sanitizeSymbol
};
