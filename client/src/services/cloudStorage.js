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
            id: holding.id,
            symbol: holding.symbol,
            shares: Number(holding.shares),
            buyPrice: Number(holding.buy_price),
            buyDate: holding.buy_date
        }));
    },

    async savePortfolio(userId, portfolio) {
        if (!supabase) return;
        await supabase.from('portfolio_holdings').delete().eq('user_id', userId);
        if (portfolio.length > 0) {
            const inserts = portfolio.map(holding => ({
                id: holding.id,
                user_id: userId,
                symbol: holding.symbol,
                shares: holding.shares,
                buy_price: holding.buyPrice,
                buy_date: holding.buyDate
            }));
            await supabase.from('portfolio_holdings').insert(inserts);
        }
    }
};
