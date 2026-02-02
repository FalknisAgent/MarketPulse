import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { searchStocks } from '../../services/api';
import { useApp } from '../../context/AppContext';
import './StockSearch.css';

function StockSearch() {
    const { state, actions } = useApp();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Debounced search
    useEffect(() => {
        if (query.length < 1) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await searchStocks(query);
                setResults(data);
                setIsOpen(true);
            } catch (err) {
                setError('Failed to search');
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                !inputRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (stock) => {
        try {
            await actions.addToWatchlist(stock.symbol);
            setQuery('');
            setResults([]);
            setIsOpen(false);
        } catch (err) {
            setError('Failed to add stock');
        }
    };

    const isInWatchlist = (symbol) => {
        return state.watchlist.includes(symbol.toUpperCase());
    };

    return (
        <div className="stock-search">
            <div className="input-group">
                <Search size={18} className="input-icon" />
                <input
                    ref={inputRef}
                    type="text"
                    className="input search-input"
                    placeholder="Search stocks by symbol or name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                />
                {query && (
                    <button
                        className="search-clear"
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                            setIsOpen(false);
                        }}
                    >
                        <X size={16} />
                    </button>
                )}
                {isLoading && <div className="search-spinner"><div className="spinner"></div></div>}
            </div>

            {isOpen && (
                <div ref={dropdownRef} className="search-dropdown">
                    {error && (
                        <div className="search-error">{error}</div>
                    )}

                    {results.length === 0 && !isLoading && !error && (
                        <div className="search-empty">No results found</div>
                    )}

                    {results.map((stock) => (
                        <button
                            key={stock.symbol}
                            className="search-result"
                            onClick={() => handleSelect(stock)}
                            disabled={isInWatchlist(stock.symbol)}
                        >
                            <div className="result-info">
                                <span className="result-symbol">{stock.symbol}</span>
                                <span className="result-name">{stock.shortName || stock.longName}</span>
                            </div>
                            <div className="result-action">
                                {isInWatchlist(stock.symbol) ? (
                                    <span className="result-added">Added</span>
                                ) : (
                                    <Plus size={18} />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default StockSearch;
