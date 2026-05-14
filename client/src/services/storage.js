const STORAGE_KEYS = {
    WATCHLIST: 'moatwise_watchlist',
    PORTFOLIO: 'moatwise_portfolio',
    SETTINGS: 'moatwise_settings',
    CACHE: 'moatwise_cache',
    LAST_UPDATE: 'moatwise_last_update'
};

// Cache freshness thresholds
const CACHE_FRESH_MS = 5 * 60 * 1000;   // 5 minutes — data considered fresh
const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours — data considered usable-but-stale
const CACHE_DEAD_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days — data evicted

/**
 * Safe JSON parse
 */
function safeJSONParse(str, fallback = null) {
    try {
        const result = JSON.parse(str);
        return result !== null ? result : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Get watchlist from storage
 * @returns {Array<string>} Array of stock symbols
 */
export function getWatchlist() {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    return safeJSONParse(data, []);
}

/**
 * Save watchlist to storage
 * @param {Array<string>} watchlist - Array of stock symbols
 */
export function saveWatchlist(watchlist) {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
}

/**
 * Add stock to watchlist
 * @param {string} symbol - Stock symbol
 */
export function addToWatchlist(symbol) {
    const watchlist = getWatchlist();
    const upperSymbol = symbol.toUpperCase();
    if (!watchlist.includes(upperSymbol)) {
        watchlist.push(upperSymbol);
        saveWatchlist(watchlist);
    }
    return watchlist;
}

/**
 * Remove stock from watchlist
 * @param {string} symbol - Stock symbol
 */
export function removeFromWatchlist(symbol) {
    const watchlist = getWatchlist();
    const filtered = watchlist.filter(s => s !== symbol.toUpperCase());
    saveWatchlist(filtered);
    return filtered;
}

/**
 * Get portfolio transactions from storage
 * @returns {Array<Object>} Array of transactions
 */
export function getPortfolio() {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    const parsed = safeJSONParse(data, []);
    // Map legacy 'holdings' format to new 'transaction' format just in case
    return parsed.map(item => ({
        id: item.id,
        symbol: item.symbol,
        type: item.type || 'BUY', // Legacy items are assumed to be BUYs
        shares: Number(item.shares),
        price: Number(item.price !== undefined ? item.price : item.buyPrice),
        fees: Number(item.fees || 0),
        tax: Number(item.tax || 0),
        date: item.date || item.buyDate
    }));
}

/**
 * Save portfolio transactions to storage
 * @param {Array<Object>} transactions - Array of transactions
 */
export function savePortfolio(transactions) {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(transactions));
}

/**
 * Add or update transaction in portfolio
 * @param {Object} transaction - { symbol, type, shares, price, date, fees, tax }
 */
export function addHolding(transaction) {
    const portfolio = getPortfolio();
    const existingIndex = portfolio.findIndex(h => h.id === transaction.id);

    if (existingIndex >= 0 && transaction.id) {
        portfolio[existingIndex] = transaction;
    } else {
        transaction.id = transaction.id || crypto.randomUUID();
        portfolio.push(transaction);
    }

    savePortfolio(portfolio);
    return portfolio;
}

/**
 * Remove transaction from portfolio
 * @param {string} id - Transaction ID
 */
export function removeHolding(id) {
    const portfolio = getPortfolio();
    const filtered = portfolio.filter(h => h.id !== id);
    savePortfolio(filtered);
    return filtered;
}

/**
 * Get cached stock data with staleness information.
 * Returns { data, isFresh, isStale } or null if no cache exists / too old.
 * - isFresh: data is < 5 min old — no refetch needed
 * - isStale: data is 5 min–24 h old — show immediately, refetch in background
 * - null: data is > 7 days or doesn't exist
 */
export function getCachedData(symbol) {
    const cache = safeJSONParse(localStorage.getItem(STORAGE_KEYS.CACHE), {});
    const entry = cache[symbol.toUpperCase()];

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;

    // Too old — treat as no cache
    if (age > CACHE_DEAD_MS) return null;

    return {
        data: entry.data,
        isFresh: age < CACHE_FRESH_MS,
        isStale: age >= CACHE_FRESH_MS
    };
}

/**
 * Save stock data to cache with quota handling
 * @param {string} symbol - Stock symbol
 * @param {Object} data - Stock data
 */
export function setCachedData(symbol, data) {
    try {
        const cache = safeJSONParse(localStorage.getItem(STORAGE_KEYS.CACHE), {});

        // Prune old entries if cache has more than 20 symbols
        const keys = Object.keys(cache);
        if (keys.length >= 20) {
            // Remove oldest 5 entries
            const sortedKeys = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            sortedKeys.slice(0, 5).forEach(k => delete cache[k]);
        }

        // Store only essential data to minimize size
        const minimalData = {
            quote: data.quote,
            financials: data.financials,
            historical: data.historical,
            buffettScore: data.buffettScore
        };

        cache[symbol.toUpperCase()] = {
            timestamp: Date.now(),
            data: minimalData
        };

        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
            console.warn('Cache quota exceeded. Clearing cache.');
            clearCache();
        } else {
            console.error('Cache error:', err);
        }
    }
}

/**
 * Update only the quote portion of a cached entry (for quick-quote phase).
 */
export function setCachedQuote(symbol, quote) {
    try {
        const cache = safeJSONParse(localStorage.getItem(STORAGE_KEYS.CACHE), {});
        const upper = symbol.toUpperCase();
        const existing = cache[upper];

        cache[upper] = {
            timestamp: existing?.timestamp || Date.now(),
            data: {
                ...(existing?.data || {}),
                quote
            }
        };

        localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
    } catch (err) {
        // Silently ignore — quote cache update is non-critical
        console.warn('setCachedQuote error:', err.message);
    }
}

/**
 * Clear all cached data
 */
export function clearCache() {
    localStorage.removeItem(STORAGE_KEYS.CACHE);
}

/**
 * Get last update time
 * @returns {string|null}
 */
export function getLastUpdate() {
    return localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
}

/**
 * Set last update time
 */
export function setLastUpdate() {
    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
}

/**
 * Get app settings
 * @returns {Object}
 */
export function getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return safeJSONParse(data, {
        theme: 'dark',
        currency: 'USD'
    });
}

/**
 * Save app settings
 * @param {Object} settings
 */
export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
