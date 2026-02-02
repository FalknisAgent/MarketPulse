const STORAGE_KEYS = {
    WATCHLIST: 'marketpulse_watchlist',
    PORTFOLIO: 'marketpulse_portfolio',
    SETTINGS: 'marketpulse_settings',
    CACHE: 'marketpulse_cache',
    LAST_UPDATE: 'marketpulse_last_update'
};

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
 * Get portfolio holdings from storage
 * @returns {Array<Object>} Array of holdings
 */
export function getPortfolio() {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    return safeJSONParse(data, []);
}

/**
 * Save portfolio to storage
 * @param {Array<Object>} portfolio - Array of holdings
 */
export function savePortfolio(portfolio) {
    localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
}

/**
 * Add or update holding in portfolio
 * @param {Object} holding - { symbol, shares, buyPrice, buyDate }
 */
export function addHolding(holding) {
    const portfolio = getPortfolio();
    const existingIndex = portfolio.findIndex(h => h.id === holding.id);

    if (existingIndex >= 0) {
        portfolio[existingIndex] = holding;
    } else {
        holding.id = Date.now().toString();
        portfolio.push(holding);
    }

    savePortfolio(portfolio);
    return portfolio;
}

/**
 * Remove holding from portfolio
 * @param {string} id - Holding ID
 */
export function removeHolding(id) {
    const portfolio = getPortfolio();
    const filtered = portfolio.filter(h => h.id !== id);
    savePortfolio(filtered);
    return filtered;
}

/**
 * Get cached stock data
 * @param {string} symbol - Stock symbol
 * @returns {Object|null} Cached data or null
 */
export function getCachedData(symbol) {
    const cache = safeJSONParse(localStorage.getItem(STORAGE_KEYS.CACHE), {});
    const entry = cache[symbol.toUpperCase()];

    if (!entry) return null;

    // Check if cache is older than 24 hours
    const cacheAge = Date.now() - entry.timestamp;
    if (cacheAge > 24 * 60 * 60 * 1000) {
        return null;
    }

    return entry.data;
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
            // Skip historical and financials as they are large
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
