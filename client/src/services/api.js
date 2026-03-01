// On Vercel, frontend and API share the same domain → use relative /api path
// For local Express dev, override with: VITE_API_URL=http://localhost:3001/api
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;

/**
 * Fetch wrapper with timeout, retry, and error handling
 */
async function fetchAPI(endpoint, retries = MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
        }

        // Retry on network errors
        if (retries > 0 && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
            console.warn(`Retrying ${endpoint}... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            return fetchAPI(endpoint, retries - 1);
        }

        console.error(`API Error (${endpoint}):`, error.message);
        throw error;
    }
}

/**
 * Search for stocks
 * @param {string} query - Search query
 * @returns {Promise<Array>} Search results
 */
export async function searchStocks(query) {
    if (!query || query.trim().length < 1) {
        return [];
    }
    return fetchAPI(`/search?q=${encodeURIComponent(query)}`);
}

/**
 * Get stock quote
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Stock quote data
 */
export async function getQuote(symbol) {
    return fetchAPI(`/quote/${symbol.toUpperCase()}`);
}

/**
 * Get historical price data
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period (1m, 3m, 6m, 1y, 5y, 10y, max)
 * @returns {Promise<Object>} Historical data
 */
export async function getHistoricalData(symbol, period = 'max') {
    return fetchAPI(`/historical/${symbol.toUpperCase()}?period=${period}`);
}

/**
 * Get financial statements and metrics
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Financials data
 */
export async function getFinancials(symbol) {
    return fetchAPI(`/financials/${symbol.toUpperCase()}`);
}

/**
 * Get all data for a stock
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Full stock data
 */
export async function getFullStockData(symbol) {
    return fetchAPI(`/full/${symbol.toUpperCase()}`);
}

/**
 * Check if API server is healthy
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE.replace(/\/api$/, '')}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
}
