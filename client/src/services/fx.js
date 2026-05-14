/**
 * FX Rate Service
 * Fetches and caches live exchange rates from the /api/fx endpoint.
 * Rates are cached in-memory for 10 minutes to avoid excessive API calls.
 */


/**
 * Fetch exchange rate from API
 * Relies on server-side cache (5 mins) for freshness and performance.
 * @param {string} from - Source currency (e.g. "USD")
 * @param {string} to   - Target currency (e.g. "EUR")
 * @returns {Promise<number>} Exchange rate
 */
export async function fetchRate(from, to) {
    if (!from || !to || from === to) return 1;

    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    const key = `${fromUpper}${toUpper}`;

    try {
        const response = await fetch(`/api/fx/${key}`);
        if (!response.ok) throw new Error(`FX API error: ${response.status}`);
        const data = await response.json();
        return data.rate;
    } catch (error) {
        console.error(`Failed to fetch FX rate ${key}:`, error.message);
        return 1; // Fallback: no conversion
    }
}

/**
 * Convert a price from one currency to another
 * @param {number} price        - Original price
 * @param {string} fromCurrency - Original currency (e.g. "CHF")
 * @param {string} toCurrency   - Target currency (e.g. "EUR")
 * @param {Object} ratesFromUSD - Map of {EUR: 0.92, CHF: 0.89, ...} rates FROM USD
 * @returns {number} Converted price
 */
export function convertPrice(price, fromCurrency, toCurrency, ratesFromUSD) {
    if (!price || !fromCurrency || !toCurrency || fromCurrency === toCurrency) return price;

    // Convert from source → USD → target
    const fromRate = ratesFromUSD[fromCurrency.toUpperCase()] ?? 1; // price of 1 fromCurrency in USD
    const toRate = ratesFromUSD[toCurrency.toUpperCase()] ?? 1;     // price of 1 toCurrency in USD

    // price in fromCurrency → USD: price / fromRate
    // USD → toCurrency: * toRate
    const priceInUSD = price / fromRate;
    return priceInUSD * toRate;
}

/**
 * Get the display symbol for a currency code
 */
export function getCurrencySymbol(currency) {
    const symbols = {
        USD: '$', EUR: '€', GBP: '£', CHF: 'Fr',
        JPY: '¥', CAD: 'CA$', AUD: 'A$', SEK: 'kr',
        NOK: 'kr', DKK: 'kr'
    };
    return symbols[currency?.toUpperCase()] ?? currency ?? '$';
}

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];
