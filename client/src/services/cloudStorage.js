import { supabase } from './supabase';

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
        return data.map(item => item.symbol);
    },

    async saveWatchlist(userId, symbols) {
        if (!supabase) return;
        await supabase.from('watchlists').delete().eq('user_id', userId);
        if (symbols.length > 0) {
            const inserts = symbols.map(symbol => ({ user_id: userId, symbol }));
            await supabase.from('watchlists').insert(inserts);
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

        // Delete existing holdings for this user
        const { error: deleteError } = await supabase
            .from('portfolio_holdings')
            .delete()
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error clearing portfolio:', deleteError);
            return;
        }

        if (portfolio.length > 0) {
            // Omit client-side 'id' — let Supabase auto-generate UUIDs
            const inserts = portfolio.map(holding => ({
                user_id: userId,
                symbol: holding.symbol,
                shares: holding.shares,
                buy_price: holding.buyPrice,
                fees: holding.fees || 0,
                tax: holding.tax || 0,
                buy_date: holding.buyDate
            }));

            const { data, error: insertError } = await supabase
                .from('portfolio_holdings')
                .insert(inserts)
                .select();   // Return inserted rows so we get the generated UUIDs

            if (insertError) {
                console.error('Error saving portfolio:', insertError);
                return null;
            }

            // Return the saved holdings with their Supabase-generated IDs
            return data?.map(row => ({
                id: row.id,
                symbol: row.symbol,
                shares: Number(row.shares),
                buyPrice: Number(row.buy_price),
                fees: Number(row.fees || 0),
                tax: Number(row.tax || 0),
                buyDate: row.buy_date
            })) || null;
        }
        return [];
    }
};
