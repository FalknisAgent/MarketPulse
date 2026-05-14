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
            .from('portfolio_transactions')
            .select('*')
            .eq('user_id', userId);
            
        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
        return data.map(tx => ({
            id: tx.id,
            symbol: tx.symbol,
            type: tx.type, // 'BUY' or 'SELL'
            shares: Number(tx.shares),
            price: Number(tx.price),
            fees: Number(tx.fees || 0),
            tax: Number(tx.tax || 0),
            date: tx.date
        }));
    },

    async savePortfolio(userId, transactions) {
        if (!supabase) return;

        try {
            // Get current IDs in DB to handle deletions gracefully
            const { data: existing } = await supabase
                .from('portfolio_transactions')
                .select('id')
                .eq('user_id', userId);
            
            const existingIds = existing?.map(r => r.id) || [];
            const newTxIds = transactions.map(t => t.id).filter(Boolean);

            // 1. Delete removed transactions
            const idsToDelete = existingIds.filter(id => !newTxIds.includes(id));
            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase.from('portfolio_transactions').delete().in('id', idsToDelete);
                if (deleteError) console.error('Error deleting removed transactions:', deleteError);
            }

            // 2. Upsert remaining transactions
            if (transactions.length > 0) {
                const upserts = transactions.map(tx => ({
                    id: tx.id,
                    user_id: userId,
                    symbol: tx.symbol,
                    type: tx.type,
                    shares: tx.shares,
                    price: tx.price,
                    fees: tx.fees || 0,
                    tax: tx.tax || 0,
                    date: tx.date
                }));

                const { data, error } = await supabase
                    .from('portfolio_transactions')
                    .upsert(upserts, { onConflict: 'id' })
                    .select();

                if (error) {
                    console.error('Error saving transactions:', error);
                    return transactions;
                }

                return data?.map(row => ({
                    id: row.id,
                    symbol: row.symbol,
                    type: row.type,
                    shares: Number(row.shares),
                    price: Number(row.price),
                    fees: Number(row.fees || 0),
                    tax: Number(row.tax || 0),
                    date: row.date
                })) || transactions;
            }
            return [];
        } catch (err) {
            console.error('Transactions sync failed:', err);
            return transactions; 
        }
    }
};
