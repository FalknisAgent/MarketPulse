import { TrendingUp, List, Briefcase, RefreshCw, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Sidebar.css';

function Sidebar() {
    const { state, actions } = useApp();
    const { activeView, portfolio, stockData, isLoading } = state;

    // Calculate portfolio totals
    const portfolioValue = portfolio.reduce((total, holding) => {
        const quote = stockData?.[holding.symbol]?.quote;
        if (quote?.price) {
            return total + (quote.price * holding.shares);
        }
        return total;
    }, 0);

    const portfolioCost = portfolio.reduce((total, holding) => {
        return total + (holding.buyPrice * holding.shares);
    }, 0);

    const portfolioGain = portfolioValue - portfolioCost;
    const portfolioGainPercent = portfolioCost > 0 ? (portfolioGain / portfolioCost) * 100 : 0;

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <BarChart3 size={28} className="logo-icon" />
                    <span className="logo-text sidebar-text">MarketPulse</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <button
                    className={`nav-item ${activeView === 'watchlist' ? 'active' : ''}`}
                    onClick={() => actions.setView('watchlist')}
                >
                    <List size={20} />
                    <span className="sidebar-text">Watchlist</span>
                    <span className="nav-badge sidebar-text">{state.watchlist.length}</span>
                </button>

                <button
                    className={`nav-item ${activeView === 'portfolio' ? 'active' : ''}`}
                    onClick={() => actions.setView('portfolio')}
                >
                    <Briefcase size={20} />
                    <span className="sidebar-text">Portfolio</span>
                    <span className="nav-badge sidebar-text">{portfolio.length}</span>
                </button>
            </nav>

            {portfolio.length > 0 && (
                <div className="sidebar-stats sidebar-text">
                    <div className="stat-card">
                        <span className="stat-label">Portfolio Value</span>
                        <span className="stat-value">
                            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Total P/L</span>
                        <span className={`stat-value ${portfolioGain >= 0 ? 'price-up' : 'price-down'}`}>
                            {portfolioGain >= 0 ? '+' : ''}
                            ${portfolioGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <small> ({portfolioGainPercent >= 0 ? '+' : ''}{portfolioGainPercent.toFixed(2)}%)</small>
                        </span>
                    </div>
                </div>
            )}

            <div className="sidebar-footer">
                <button
                    className="btn btn-secondary w-full"
                    onClick={actions.refreshAllStocks}
                    disabled={isLoading}
                >
                    <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                    <span className="sidebar-text">{isLoading ? 'Refreshing...' : 'Refresh All'}</span>
                </button>

                {state.lastUpdate && (
                    <p className="last-update sidebar-text">
                        Last update: {new Date(state.lastUpdate).toLocaleString()}
                    </p>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
