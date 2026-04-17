import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import * as storage from '../services/storage';
import * as api from '../services/api';
import { calculateBuffettScore } from '../utils/buffettMetrics';
import { supabase } from '../services/supabase';
import { cloudStorage } from '../services/cloudStorage';
import { fetchRate, convertPrice as fxConvert, getCurrencySymbol } from '../services/fx';

// Initial state
const initialState = {
    // View state
    activeView: 'watchlist', // 'watchlist' | 'portfolio' | 'auth'
    expandedStock: null,
    paywallMessage: null,
    
    user: null,
    session: null,

    // Data
    watchlist: [],
    portfolio: [],
    stockData: {}, // { [symbol]: { quote, financials, historical, buffettScore, loading, error } }

    // App state
    isLoading: false,
    lastUpdate: null,
    apiHealthy: true,
    error: null,

    // Currency
    selectedCurrency: 'USD',
    fxRates: { USD: 1 }, // conversion rates: 1 unit of currency → USD
};

// Action types
const ACTIONS = {
    SET_VIEW: 'SET_VIEW',
    SET_PAYWALL: 'SET_PAYWALL',
    SET_EXPANDED: 'SET_EXPANDED',
    SET_AUTH: 'SET_AUTH',
    SET_WATCHLIST: 'SET_WATCHLIST',
    ADD_TO_WATCHLIST: 'ADD_TO_WATCHLIST',
    REMOVE_FROM_WATCHLIST: 'REMOVE_FROM_WATCHLIST',
    SET_PORTFOLIO: 'SET_PORTFOLIO',
    ADD_HOLDING: 'ADD_HOLDING',
    REMOVE_HOLDING: 'REMOVE_HOLDING',
    UPDATE_HOLDING: 'UPDATE_HOLDING',
    SET_STOCK_DATA: 'SET_STOCK_DATA',
    SET_STOCK_LOADING: 'SET_STOCK_LOADING',
    SET_STOCK_ERROR: 'SET_STOCK_ERROR',
    SET_LOADING: 'SET_LOADING',
    SET_LAST_UPDATE: 'SET_LAST_UPDATE',
    SET_API_HEALTH: 'SET_API_HEALTH',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    SET_CURRENCY: 'SET_CURRENCY',
    SET_FX_RATES: 'SET_FX_RATES'
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_VIEW:
            return { ...state, activeView: action.payload, expandedStock: null, paywallMessage: null };
            
        case ACTIONS.SET_PAYWALL:
            return { ...state, paywallMessage: action.payload };

        case ACTIONS.SET_EXPANDED:
            return { ...state, expandedStock: action.payload };

        case ACTIONS.SET_AUTH:
            return { ...state, user: action.payload.user, session: action.payload.session };

        case ACTIONS.SET_WATCHLIST:
            return { ...state, watchlist: action.payload };

        case ACTIONS.ADD_TO_WATCHLIST:
            if (state.watchlist.includes(action.payload)) return state;
            return { ...state, watchlist: [...state.watchlist, action.payload] };

        case ACTIONS.REMOVE_FROM_WATCHLIST:
            return {
                ...state,
                watchlist: state.watchlist.filter(s => s !== action.payload),
                expandedStock: state.expandedStock === action.payload ? null : state.expandedStock
            };

        case ACTIONS.SET_PORTFOLIO:
            return { ...state, portfolio: action.payload };

        case ACTIONS.ADD_HOLDING:
            const existingIdx = state.portfolio.findIndex(h => h.id === action.payload.id);
            if (existingIdx >= 0) {
                const newPortfolio = [...state.portfolio];
                newPortfolio[existingIdx] = action.payload;
                return { ...state, portfolio: newPortfolio };
            }
            return { ...state, portfolio: [...state.portfolio, action.payload] };

        case ACTIONS.REMOVE_HOLDING:
            return {
                ...state,
                portfolio: state.portfolio.filter(h => h.id !== action.payload)
            };

        case ACTIONS.UPDATE_HOLDING:
            return {
                ...state,
                portfolio: state.portfolio.map(h =>
                    h.id === action.payload.id ? { ...h, ...action.payload } : h
                )
            };

        case ACTIONS.SET_STOCK_DATA:
            return {
                ...state,
                stockData: {
                    ...(state.stockData || {}),
                    [action.payload.symbol]: {
                        ...(state.stockData?.[action.payload.symbol] || {}),
                        ...action.payload.data,
                        loading: false,
                        error: null
                    }
                }
            };

        case ACTIONS.SET_STOCK_LOADING:
            return {
                ...state,
                stockData: {
                    ...(state.stockData || {}),
                    [action.payload]: {
                        ...(state.stockData?.[action.payload] || {}),
                        loading: true,
                        error: null
                    }
                }
            };

        case ACTIONS.SET_STOCK_ERROR:
            return {
                ...state,
                stockData: {
                    ...(state.stockData || {}),
                    [action.payload.symbol]: {
                        ...(state.stockData?.[action.payload.symbol] || {}),
                        loading: false,
                        error: action.payload.error
                    }
                }
            };

        case ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };

        case ACTIONS.SET_LAST_UPDATE:
            return { ...state, lastUpdate: action.payload };

        case ACTIONS.SET_API_HEALTH:
            return { ...state, apiHealthy: action.payload };

        case ACTIONS.SET_ERROR:
            return { ...state, error: action.payload };

        case ACTIONS.CLEAR_ERROR:
            return { ...state, error: null };

        case ACTIONS.SET_CURRENCY:
            return { ...state, selectedCurrency: action.payload };

        case ACTIONS.SET_FX_RATES:
            return { ...state, fxRates: { ...state.fxRates, ...action.payload } };

        default:
            return state;
    }
}

// Create context
const AppContext = createContext(null);

// Provider component
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Load data from storage on mount
    useEffect(() => {
        const watchlist = storage.getWatchlist();
        const portfolio = storage.getPortfolio();
        const lastUpdate = storage.getLastUpdate();

        dispatch({ type: ACTIONS.SET_WATCHLIST, payload: watchlist });
        dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: portfolio });
        if (lastUpdate) {
            dispatch({ type: ACTIONS.SET_LAST_UPDATE, payload: lastUpdate });
        }

        // Check API health
        api.checkHealth().then(healthy => {
            dispatch({ type: ACTIONS.SET_API_HEALTH, payload: healthy });
        });

        if (supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                dispatch({ type: ACTIONS.SET_AUTH, payload: { session, user: session?.user || null } });
            });
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                dispatch({ type: ACTIONS.SET_AUTH, payload: { session, user: session?.user || null } });
            });
            return () => subscription.unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (state.user) {
            const loadCloudData = async () => {
                const cloudWatchlist = await cloudStorage.getWatchlist(state.user.id);
                const cloudPortfolio = await cloudStorage.getPortfolio(state.user.id);
                
                const localWatchlist = storage.getWatchlist();
                const localPortfolio = storage.getPortfolio();
                
                if (cloudWatchlist.length === 0 && localWatchlist.length > 0) {
                     await cloudStorage.saveWatchlist(state.user.id, localWatchlist);
                     dispatch({ type: ACTIONS.SET_WATCHLIST, payload: localWatchlist });
                } else {
                     dispatch({ type: ACTIONS.SET_WATCHLIST, payload: cloudWatchlist });
                }
                
                if (cloudPortfolio.length === 0 && localPortfolio.length > 0) {
                     await cloudStorage.savePortfolio(state.user.id, localPortfolio);
                     dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: localPortfolio });
                } else {
                     dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: cloudPortfolio });
                }
            };
            loadCloudData();
        } else {
             dispatch({ type: ACTIONS.SET_WATCHLIST, payload: storage.getWatchlist() });
             dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: storage.getPortfolio() });
        }
    }, [state.user]);

    useEffect(() => {
        if (state.user) { cloudStorage.saveWatchlist(state.user.id, state.watchlist); } 
        else { storage.saveWatchlist(state.watchlist); }
    }, [state.watchlist, state.user]);

    // FX Rate Management
    const refreshFXRates = useCallback(async () => {
        // 1. Discover all unique currencies in use
        const currencies = new Set([state.selectedCurrency]);
        
        // From watchlist data
        Object.values(state.stockData).forEach(stock => {
            if (stock.quote?.currency) currencies.add(stock.quote.currency.toUpperCase());
        });
        
        // From portfolio
        state.portfolio.forEach(holding => {
            if (holding.currency) currencies.add(holding.currency.toUpperCase()); // Just in case holding has currency
        });

        // 2. Fetch rates for all unique currencies vs USD
        const newRates = {};
        for (const cur of currencies) {
            if (cur === 'USD') continue;
            try {
                // We ask for USD -> CUR rate (e.g. 1 USD = 0.89 CHF)
                const rate = await fetchRate('USD', cur);
                newRates[cur] = rate;
            } catch (err) {
                console.warn(`Could not refresh FX for ${cur}`);
            }
        }

        if (Object.keys(newRates).length > 0) {
            dispatch({ type: ACTIONS.SET_FX_RATES, payload: newRates });
        }
    }, [state.selectedCurrency, state.stockData, state.portfolio]);

    // Refresh FX rates every 10 minutes
    useEffect(() => {
        refreshFXRates();
        const interval = setInterval(refreshFXRates, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refreshFXRates]);

    useEffect(() => {
        if (state.user) { cloudStorage.savePortfolio(state.user.id, state.portfolio); } 
        else { storage.savePortfolio(state.portfolio); }
    }, [state.portfolio, state.user]);

    // Fetch stock data
    const fetchStockData = useCallback(async (symbol, forceRefresh = false) => {
        const upperSymbol = symbol.toUpperCase();

        // Check cache unless forcing refresh
        if (!forceRefresh) {
            const cached = storage.getCachedData(upperSymbol);
            // Verify cache has required full data (financials and score)
            if (cached && cached.financials && cached.buffettScore) {
                dispatch({
                    type: ACTIONS.SET_STOCK_DATA,
                    payload: { symbol: upperSymbol, data: cached }
                });
                return cached;
            }
        }

        // Enforce Local Guest Limit
        if (!state.user) {
            let checkedStocks = JSON.parse(localStorage.getItem('moatwise_guest_checked') || '[]');
            if (!checkedStocks.includes(upperSymbol)) {
                if (checkedStocks.length >= 3) {
                    const msg = "You've exhausted your 3 free stock checks. Create an account to unlock unlimited access!";
                    dispatch({ type: ACTIONS.SET_PAYWALL, payload: msg });
                    return null;
                }
                checkedStocks.push(upperSymbol);
                localStorage.setItem('moatwise_guest_checked', JSON.stringify(checkedStocks));
            }
        }

        dispatch({ type: ACTIONS.SET_STOCK_LOADING, payload: upperSymbol });

        try {
            const data = await api.getFullStockData(upperSymbol);
            const buffettScore = calculateBuffettScore(data.financials, data.quote);

            const stockData = {
                quote: data.quote,
                financials: data.financials,
                historical: data.historical,
                buffettScore
            };

            // Cache the data
            storage.setCachedData(upperSymbol, stockData);

            dispatch({
                type: ACTIONS.SET_STOCK_DATA,
                payload: { symbol: upperSymbol, data: stockData }
            });

            // Trigger FX refresh in case this is a new currency
            if (stockData.quote.currency && stockData.quote.currency !== 'USD') {
                refreshFXRates();
            }

            return stockData;
        } catch (error) {
            if (error.isPaywall) {
                dispatch({ type: ACTIONS.SET_PAYWALL, payload: error.message });
            } else {
                dispatch({
                    type: ACTIONS.SET_STOCK_ERROR,
                    payload: { symbol: upperSymbol, error: error.message }
                });
            }
            throw error;
        }
    }, [dispatch]);

    // Refresh all stocks
    const refreshAllStocks = useCallback(async () => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true });

        // Get unique symbols from watchlist and portfolio
        const portfolioSymbols = state.portfolio.map(h => h.symbol);
        const allSymbols = [...new Set([...state.watchlist, ...portfolioSymbols])];

        try {
            await Promise.all(allSymbols.map(s => fetchStockData(s, true)));
            const now = new Date().toISOString();
            storage.setLastUpdate();
            dispatch({ type: ACTIONS.SET_LAST_UPDATE, payload: now });
        } catch (error) {
            dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to refresh some stocks' });
        } finally {
            dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        }
    }, [state.watchlist, state.portfolio, fetchStockData]);

    // Actions
    const actions = {
        setView: (view) => dispatch({ type: ACTIONS.SET_VIEW, payload: view }),

        setExpanded: (symbol) => dispatch({ type: ACTIONS.SET_EXPANDED, payload: symbol }),

        addToWatchlist: async (symbol) => {
            const upperSymbol = symbol.toUpperCase();
            try {
                await fetchStockData(upperSymbol);
                dispatch({ type: ACTIONS.ADD_TO_WATCHLIST, payload: upperSymbol });
            } catch (error) {
                console.error('Failed to fetch stock data:', error.message);
            }
        },

        removeFromWatchlist: (symbol) => {
            dispatch({ type: ACTIONS.REMOVE_FROM_WATCHLIST, payload: symbol.toUpperCase() });
        },

        addHolding: async (holding) => {
            const newHolding = {
                ...holding,
                id: holding.id || Date.now().toString(),
                symbol: holding.symbol.toUpperCase()
            };

            // Fetch stock data first to validate limit
            if (!state.stockData?.[newHolding.symbol]) {
                try {
                    await fetchStockData(newHolding.symbol);
                } catch (error) {
                    console.error('Failed to fetch stock data:', error.message);
                    return; // abort adding holding
                }
            }

            dispatch({ type: ACTIONS.ADD_HOLDING, payload: newHolding });

            // Also add to watchlist if not there
            if (!state.watchlist.includes(newHolding.symbol)) {
                dispatch({ type: ACTIONS.ADD_TO_WATCHLIST, payload: newHolding.symbol });
            }
        },

        removeHolding: (id) => {
            dispatch({ type: ACTIONS.REMOVE_HOLDING, payload: id });
        },

        updateHolding: (holding) => {
            dispatch({ type: ACTIONS.UPDATE_HOLDING, payload: holding });
        },

        fetchStockData,
        refreshAllStocks,

        clearError: () => dispatch({ type: ACTIONS.CLEAR_ERROR }),

        // Currency actions
        setCurrency: async (currency) => {
            dispatch({ type: ACTIONS.SET_CURRENCY, payload: currency });
            // The refreshFXRates effect will pick up this change and fetch the rate
        },

        // Convert a price from its native currency to the selected display currency
        convertPrice: (price, fromCurrency) => {
            if (!price) return price;
            // fxRates stores: "USD → currency" rates  e.g. { EUR: 0.92, CHF: 0.89 }
            // So to convert: price (in fromCurrency) → USD → selectedCurrency
            // Step 1: fromCurrency → USD using inverse of USD→fromCurrency rate
            // Step 2: USD → selectedCurrency using USD→selectedCurrency rate
            const from = (fromCurrency || 'USD').toUpperCase();
            const to = state.selectedCurrency.toUpperCase();
            if (from === to) return price;

            const fromRateUSD = state.fxRates[from] ?? null; // USD→from rate
            const toRateUSD = state.fxRates[to] ?? null;     // USD→to rate

            // If we don't have the rates yet, return unconverted
            if (!fromRateUSD || !toRateUSD) return price;

            const priceInUSD = price / fromRateUSD;
            return priceInUSD * toRateUSD;
        },

        getCurrencySymbol: (currency) => getCurrencySymbol(currency ?? state.selectedCurrency)
    };

    return (
        <AppContext.Provider value={{ state, actions }}>
            {children}
        </AppContext.Provider>
    );
}

// Hook for using the context
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

export default AppContext;
