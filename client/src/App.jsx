import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StockCard from './components/StockCard/StockCard';
import './styles/index.css';

function AppContent() {
  const { state } = useApp();
  const { activeView, watchlist, portfolio } = state;

  // Get unique symbols for portfolio view
  const portfolioSymbols = [...new Set(portfolio.map(h => h.symbol))];

  // Combine all symbols for the active view
  const symbolsToShow = activeView === 'watchlist'
    ? watchlist
    : portfolioSymbols;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content-area">
          {symbolsToShow.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h2>
                {activeView === 'watchlist'
                  ? 'Your Watchlist is Empty'
                  : 'No Portfolio Holdings'}
              </h2>
              <p>
                {activeView === 'watchlist'
                  ? 'Search for stocks above and add them to your watchlist to start tracking.'
                  : 'Add stocks to your watchlist and track your holdings to see them here.'}
              </p>
            </div>
          ) : (
            <div className="stocks-list">
              {symbolsToShow.map(symbol => (
                <StockCard
                  key={symbol}
                  symbol={symbol}
                  showHoldings={activeView === 'portfolio'}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
