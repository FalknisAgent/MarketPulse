import { Search, AlertCircle, LogIn, LogOut, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabase';
import StockSearch from '../StockCard/StockSearch';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../services/fx';

function Header() {
    const { state, actions } = useApp();

    const handleCurrencyChange = (e) => {
        actions.setCurrency(e.target.value);
    };

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-left">
                    <h1 className="header-title">
                        {state.activeView === 'watchlist' ? 'Watchlist'
                          : state.activeView === 'auth' ? 'Account'
                          : 'Portfolio'}
                    </h1>
                </div>

                <div className="header-center">
                    <StockSearch />
                </div>

                <div className="header-right">
                    {/* Currency Selector */}
                    <div className="currency-selector-wrapper">
                        <select
                            id="currency-selector"
                            className="currency-selector"
                            value={state.selectedCurrency}
                            onChange={handleCurrencyChange}
                            title="Display currency"
                        >
                            {SUPPORTED_CURRENCIES.map(c => (
                                <option key={c} value={c}>
                                    {getCurrencySymbol(c)} {c}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="currency-chevron" />
                    </div>

                    {!state.apiHealthy && (
                        <div className="api-status-warning">
                            <AlertCircle size={16} />
                            <span>API Offline</span>
                        </div>
                    )}
                    {state.user ? (
                        <button className="btn btn-secondary" onClick={() => supabase.auth.signOut()} title="Sign Out">
                            <LogOut size={16} /><span>Sign Out</span>
                        </button>
                    ) : (
                         <button className="btn btn-primary" onClick={() => actions.setView('auth')}>
                            <LogIn size={16} /><span>Sign In</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
