import { Search, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import StockSearch from '../StockCard/StockSearch';
import './Header.css';

function Header() {
    const { state } = useApp();

    return (
        <header className="header">
            <div className="header-content">
                <div className="header-left">
                    <h1 className="header-title">
                        {state.activeView === 'watchlist' ? 'Watchlist' : 'Portfolio'}
                    </h1>
                </div>

                <div className="header-center">
                    <StockSearch />
                </div>

                <div className="header-right">
                    {!state.apiHealthy && (
                        <div className="api-status-warning">
                            <AlertCircle size={16} />
                            <span>API Offline</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
