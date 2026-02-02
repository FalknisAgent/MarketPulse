import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import * as storage from '../services/storage';
import * as api from '../services/api';
import { calculateBuffettScore } from '../utils/buffettMetrics';

// Initial state
const initialState = {
    // View state
    activeView: 'watchlist', // 'watchlist' | 'portfolio'
    expandedStock: null,

    // Data
    watchlist: [],
    portfolio: [],
    stockData: {}, // { [symbol]: { quote, financials, historical, buffettScore, loading, error } }

    // App state
    isLoading: false,
    lastUpdate: null,
    apiHealthy: true,
    error: null
};

// Action types
const ACTIONS = {
    SET_VIEW: 'SET_VIEW',
    SET_EXPANDED: 'SET_EXPANDED',
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
    CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
function appReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_VIEW:
            return { ...state, activeView: action.payload };

        case ACTIONS.SET_EXPANDED:
            return { ...state, expandedStock: action.payload };

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
    }, []);

    // Persist watchlist changes
    useEffect(() => {
        storage.saveWatchlist(state.watchlist);
    }, [state.watchlist]);

    // Persist portfolio changes
    useEffect(() => {
        storage.savePortfolio(state.portfolio);
    }, [state.portfolio]);

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

            return stockData;
        } catch (error) {
            dispatch({
                type: ACTIONS.SET_STOCK_ERROR,
                payload: { symbol: upperSymbol, error: error.message }
            });
            throw error;
        }
    }, []);

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
            dispatch({ type: ACTIONS.ADD_TO_WATCHLIST, payload: upperSymbol });
            try {
                await fetchStockData(upperSymbol);
            } catch (error) {
                // Error already handled by fetchStockData which sets error state
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
            dispatch({ type: ACTIONS.ADD_HOLDING, payload: newHolding });

            // Also add to watchlist if not there
            if (!state.watchlist.includes(newHolding.symbol)) {
                dispatch({ type: ACTIONS.ADD_TO_WATCHLIST, payload: newHolding.symbol });
            }

            // Fetch stock data if needed
            if (!state.stockData?.[newHolding.symbol]) {
                try {
                    await fetchStockData(newHolding.symbol);
                } catch (error) {
                    console.error('Failed to fetch stock data:', error.message);
                }
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

        clearError: () => dispatch({ type: ACTIONS.CLEAR_ERROR })
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
