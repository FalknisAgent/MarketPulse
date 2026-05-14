import { TrendingUp, List, Briefcase, RefreshCw, BarChart3, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

function Sidebar() {
    const { state, actions } = useApp();
    const { activeView, portfolio, stockData, isLoading } = state;

    // Portfolio totals removed as per request

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <BarChart3 size={28} className="logo-icon" />
                    <span className="logo-text sidebar-text">MoatWise</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {state.user && (
                    <div className="nav-group">
                        <button
                            className={`nav-item ${activeView === 'portfolio' ? 'active' : ''}`}
                            onClick={() => actions.setView('portfolio')}
                            style={{ marginBottom: portfolio.length > 0 ? '4px' : '0' }}
                        >
                            <Briefcase size={20} />
                            <span className="sidebar-text">Portfolio</span>
                            <span className="nav-badge sidebar-text">{portfolio.length}</span>
                        </button>
                        
                        {/* Removed portfolio stats as per request */}
                    </div>
                )}

                <button
                    className={`nav-item ${activeView === 'watchlist' ? 'active' : ''}`}
                    onClick={() => actions.setView('watchlist')}
                >
                    <List size={20} />
                    <span className="sidebar-text">Watchlist</span>
                    <span className="nav-badge sidebar-text">{state.watchlist.length}</span>
                </button>

                <button
                    className={`nav-item ${activeView === 'auth' ? 'active' : ''}`}
                    onClick={() => actions.setView('auth')}
                >
                    <User size={20} />
                    <span className="sidebar-text">{state.user ? 'My Account' : 'Sign In'}</span>
                </button>
            </nav>

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
