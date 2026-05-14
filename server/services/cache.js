/**
 * Simple in-memory cache with configurable TTL.
 * Used to avoid redundant Yahoo Finance API calls.
 */

class MemoryCache {
    constructor() {
        this.store = new Map();
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Get a cached value
     * @param {string} key
     * @returns {*|null} Cached value or null if expired/missing
     */
    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Set a cached value
     * @param {string} key
     * @param {*} value
     * @param {number} ttlMs - Time-to-live in milliseconds
     */
    set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    /**
     * Remove expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Get cache stats
     */
    stats() {
        return {
            size: this.store.size,
            keys: [...this.store.keys()]
        };
    }
}

// TTL constants (in milliseconds)
const CACHE_TTL = {
    QUOTE: 5 * 60 * 1000,       // 5 minutes — prices change frequently
    FINANCIALS: 30 * 60 * 1000,  // 30 minutes — statements rarely change
    HISTORICAL: 15 * 60 * 1000,  // 15 minutes — historical data is stable
    SEARCH: 10 * 60 * 1000       // 10 minutes — search results are stable
};

// Singleton instance
const cache = new MemoryCache();

module.exports = { cache, CACHE_TTL };
