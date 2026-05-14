import { supabase } from './supabase';

let isSavingWatchlist = false;
let pendingWatchlist = null;

export const cloudStorage = {
    async getWatchlist(userId) {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('watchlists')
            .select('symbol')
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error fetching watchlist:', error);
            return [];
        }
        // Deduplicate on read just in case
        return [...new Set(data.map(item => item.symbol))];
    },

    async saveWatchlist(userId, symbols) {
        if (!supabase) return;

        // Deduplicate locally
        const uniqueSymbols = [...new Set(symbols)];
        
        pendingWatchlist = uniqueSymbols;
        if (isSavingWatchlist) return;
        
        isSavingWatchlist = true;
        
        try {
            while (pendingWatchlist !== null) {
                const currentSymbols = pendingWatchlist;
                pendingWatchlist = null;
                
                // Await delete completely before inserting to prevent race conditions
                const { error: delError } = await supabase.from('watchlists').delete().eq('user_id', userId);
                if (delError) console.error('Watchlist delete error:', delError);
                
                if (currentSymbols.length > 0) {
                    const inserts = currentSymbols.map(symbol => ({ user_id: userId, symbol }));
                    const { error: insError } = await supabase.from('watchlists').insert(inserts);
                    if (insError) console.error('Watchlist insert error:', insError);
                }
            }
        } finally {
            isSavingWatchlist = false;
        }
    },

    async getPortfolio(userId) {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('portfolio_holdings')
            .select('*')
            .eq('user_id', userId);
            
        if (error) {
            console.error('Error fetching portfolio:', error);
            return [];
        }
        return data.map(holding => ({
            id: holding.id,       // Supabase-generated UUID
            symbol: holding.symbol,
            shares: Number(holding.shares),
            buyPrice: Number(holding.buy_price),
            fees: Number(holding.fees || 0),
            tax: Number(holding.tax || 0),
            buyDate: holding.buy_date
        }));
    },

    async savePortfolio(userId, portfolio) {
        if (!supabase) return;

        try {
            // Get current IDs in DB to handle deletions gracefully
            const { data: existing } = await supabase
                .from('portfolio_holdings')
                .select('id')
                .eq('user_id', userId);
            
            const existingIds = existing?.map(r => r.id) || [];
            const newPortfolioIds = portfolio.map(h => h.id).filter(Boolean);

            // 1. Delete removed holdings
            const idsToDelete = existingIds.filter(id => !newPortfolioIds.includes(id));
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase.from('portfolio_holdings').delete().in('id', idsToDelete);
                if (deleteError) console.error('Error deleting removed holdings:', deleteError);
            }

            // 2. Upsert remaining holdings
            if (portfolio.length > 0) {
                const upserts = portfolio.map(holding => ({
                    id: holding.id, // Use client-generated UUID or existing UUID
                    user_id: userId,
                    symbol: holding.symbol,
                    shares: holding.shares,
                    buy_price: holding.buyPrice,
                    fees: holding.fees || 0,
                    tax: holding.tax || 0,
                    buy_date: holding.buyDate
                }));

                const { data, error } = await supabase
                    .from('portfolio_holdings')
                    .upsert(upserts, { onConflict: 'id' })
                    .select();

                if (error) {
                    console.error('Error saving portfolio (ensure fees/tax columns exist in Supabase):', error);
                    // Return the original portfolio so the local state isn't broken
                    return portfolio;
                }

                return data?.map(row => ({
                    id: row.id,
                    symbol: row.symbol,
                    shares: Number(row.shares),
                    buyPrice: Number(row.buy_price),
                    fees: Number(row.fees || 0),
                    tax: Number(row.tax || 0),
                    buyDate: row.buy_date
                })) || portfolio;
            }
            return [];
        } catch (err) {
            console.error('Portfolio sync failed:', err);
            return portfolio; // Return current portfolio so it doesn't get cleared on error
        }
    }
};
