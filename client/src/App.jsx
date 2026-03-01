import { useState } from 'react';
import { X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import StockCard from './components/StockCard/StockCard';
import './index.css';

function AppContent() {
  const { state } = useApp();
  const { activeView, watchlist, portfolio } = state;
  const [showDisclaimer, setShowDisclaimer] = useState(true);

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
                  showHoldings={true} /* Always show holdings capability to allow adding */
                />
              ))}
            </div>
          )}
        </div>

        {showDisclaimer && (
          <footer className="app-footer">
            <div className="disclaimer-text">
              <button
                className="btn-icon-sm disclaimer-close"
                onClick={() => setShowDisclaimer(false)}
                title="Dismiss Disclaimer"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent' }}
              >
                <X size={16} />
              </button>
              <strong>DISCLAIMER:</strong> This application is for informational and educational purposes only.
              It does NOT constitute financial, investment, or legal advice. The "Moat Score" and other metrics are based on historical
              data and algorithms that may not be accurate or applicable to your specific situation.
              Always conduct your own due diligence (DYOR) and consult with a qualified financial advisor before
              making any investment decisions.
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
      <Analytics />
    </AppProvider>
  );
}

export default App;
