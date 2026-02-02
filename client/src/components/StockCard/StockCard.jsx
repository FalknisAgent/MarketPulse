import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, X, TrendingUp, TrendingDown,
    Minus, RefreshCw, PlusCircle, AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import BuffettScore from '../Metrics/BuffettScore';
import MetricsPanel from '../Metrics/MetricsPanel';
import FinancialsPanel from '../Metrics/FinancialsPanel';
import PriceChart from '../Charts/PriceChart';
import HoldingForm from '../Portfolio/HoldingForm';
import { formatCurrency, formatPercent } from '../../utils/buffettMetrics';
import './StockCard.css';

function StockCard({ symbol, showHoldings = false }) {
    const { state, actions } = useApp();
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddHolding, setShowAddHolding] = useState(false);

    // Defensive check for stockData
    const stockData = state.stockData?.[symbol];
    const isExpanded = state.expandedStock === symbol;
    const quote = stockData?.quote;
    const buffettScore = stockData?.buffettScore;
    const isLoading = stockData?.loading;
    const error = stockData?.error;

    // Fetch data if not loaded
    useEffect(() => {
        if (!stockData && !isLoading && state.stockData !== null) {
            actions.fetchStockData(symbol);
        }
    }, [symbol, stockData, isLoading, state.stockData, actions]);

    // Get holdings for this stock
    const holdings = state.portfolio.filter(h => h.symbol === symbol);
    const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.shares * h.buyPrice), 0);
    const currentValue = quote?.price ? totalShares * quote.price : 0;
    const totalGain = currentValue - totalCost;
    const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    const handleToggleExpand = () => {
        actions.setExpanded(isExpanded ? null : symbol);
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        actions.removeFromWatchlist(symbol);
    };

    const handleRefresh = async (e) => {
        e.stopPropagation();
        await actions.fetchStockData(symbol, true);
    };

    const getPriceChangeIcon = () => {
        if (!quote?.change) return <Minus size={16} />;
        return quote.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
    };

    const getPriceChangeClass = () => {
        if (!quote?.change) return 'price-neutral';
        return quote.change >= 0 ? 'price-up' : 'price-down';
    };

    const getScoreClass = () => {
        if (!buffettScore?.score) return '';
        if (buffettScore.score >= 80) return 'score-excellent';
        if (buffettScore.score >= 60) return 'score-good';
        if (buffettScore.score >= 40) return 'score-fair';
        return 'score-poor';
    };

    if (error) {
        return (
            <div className="stock-card stock-card-error">
                <div className="card-header-row">
                    <div className="stock-symbol">{symbol}</div>
                    <div className="error-message">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <div className="card-actions">
                        <button className="btn btn-ghost btn-icon" onClick={handleRefresh}>
                            <RefreshCw size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={handleRemove}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`stock-card ${isExpanded ? 'expanded' : ''}`}>
            {/* Collapsed Header */}
            <div className="card-header-row" onClick={handleToggleExpand}>
                <div className="stock-info">
                    <div className="stock-symbol">{symbol}</div>
                    <div className="stock-name">{quote?.shortName || quote?.longName || 'Loading...'}</div>
                </div>

                <div className="stock-price">
                    {isLoading ? (
                        <div className="skeleton" style={{ width: 80, height: 24 }}></div>
                    ) : quote?.price ? (
                        <>
                            <span className="price-value">${quote.price.toFixed(2)}</span>
                            <span className={`price-change ${getPriceChangeClass()}`}>
                                {getPriceChangeIcon()}
                                {quote.change >= 0 ? '+' : ''}
                                {quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
                            </span>
                        </>
                    ) : (
                        <span className="text-muted">--</span>
                    )}
                </div>

                {showHoldings && holdings.length > 0 && (
                    <div className="holding-summary">
                        <span className="holding-shares">{totalShares} shares</span>
                        <span className={`holding-gain ${totalGain >= 0 ? 'price-up' : 'price-down'}`}>
                            {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                            <small> ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)</small>
                        </span>
                    </div>
                )}

                <div className="buffett-badge-wrapper">
                    {isLoading ? (
                        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }}></div>
                    ) : buffettScore?.score !== undefined ? (
                        <div className={`buffett-badge ${getScoreClass()}`}>
                            <span className="badge-score">{buffettScore.score}</span>
                        </div>
                    ) : null}
                </div>

                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={handleRemove}>
                        <X size={16} />
                    </button>
                    <button className="btn btn-ghost btn-icon expand-btn">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`expand-transition ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="card-expanded-content">
                    {/* Tabs */}
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`tab ${activeTab === 'financials' ? 'active' : ''}`}
                            onClick={() => setActiveTab('financials')}
                        >
                            Financials
                        </button>
                        <button
                            className={`tab ${activeTab === 'buffett' ? 'active' : ''}`}
                            onClick={() => setActiveTab('buffett')}
                        >
                            Buffett Metrics
                        </button>
                        <button
                            className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chart')}
                        >
                            Chart
                        </button>
                        {showHoldings && (
                            <button
                                className={`tab ${activeTab === 'holdings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('holdings')}
                            >
                                Holdings
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'overview' && (
                            <div className="overview-content">
                                <div className="overview-grid">
                                    <BuffettScore score={buffettScore} />

                                    <div className="quick-stats">
                                        <h4>Key Statistics</h4>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <span className="stat-label">Market Cap</span>
                                                <span className="stat-value">{formatCurrency(quote?.marketCap)}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">P/E Ratio</span>
                                                <span className="stat-value">{quote?.peRatio?.toFixed(2) || 'N/A'}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">EPS</span>
                                                <span className="stat-value">${quote?.eps?.toFixed(2) || 'N/A'}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Dividend Yield</span>
                                                <span className="stat-value">
                                                    {quote?.dividendYield ? formatPercent(quote.dividendYield * 100) : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">52W High</span>
                                                <span className="stat-value">${quote?.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">52W Low</span>
                                                <span className="stat-value">${quote?.fiftyTwoWeekLow?.toFixed(2) || 'N/A'}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Volume</span>
                                                <span className="stat-value">{quote?.volume?.toLocaleString() || 'N/A'}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Avg Volume</span>
                                                <span className="stat-value">{quote?.avgVolume?.toLocaleString() || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <FinancialsPanel financials={stockData?.financials} />
                        )}

                        {activeTab === 'buffett' && (
                            <MetricsPanel metrics={buffettScore?.metrics} score={buffettScore} />
                        )}

                        {activeTab === 'chart' && (
                            <PriceChart symbol={symbol} historicalData={stockData?.historical} />
                        )}

                        {activeTab === 'holdings' && showHoldings && (
                            <div className="holdings-content">
                                <div className="holdings-header">
                                    <h4>Your Holdings</h4>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowAddHolding(true)}
                                    >
                                        <PlusCircle size={16} />
                                        Add Position
                                    </button>
                                </div>

                                {holdings.length === 0 ? (
                                    <div className="no-holdings">
                                        <p>No holdings for this stock yet.</p>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setShowAddHolding(true)}
                                        >
                                            Add Your First Position
                                        </button>
                                    </div>
                                ) : (
                                    <div className="holdings-list">
                                        {holdings.map(holding => (
                                            <div key={holding.id} className="holding-item">
                                                <div className="holding-details">
                                                    <span className="holding-shares">{holding.shares} shares</span>
                                                    <span className="holding-price">@ ${holding.buyPrice.toFixed(2)}</span>
                                                    <span className="holding-date">
                                                        {new Date(holding.buyDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="holding-value">
                                                    <span className="current-value">
                                                        {formatCurrency(holding.shares * (quote?.price || 0))}
                                                    </span>
                                                    {quote?.price && (
                                                        <span className={`holding-pl ${(quote.price - holding.buyPrice) >= 0 ? 'price-up' : 'price-down'
                                                            }`}>
                                                            {((quote.price - holding.buyPrice) / holding.buyPrice * 100).toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => actions.removeHolding(holding.id)}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="holdings-total">
                                            <span>Total Position</span>
                                            <div className="total-values">
                                                <span className="total-value">{formatCurrency(currentValue)}</span>
                                                <span className={`total-pl ${totalGain >= 0 ? 'price-up' : 'price-down'}`}>
                                                    {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                                                    ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showAddHolding && (
                                    <HoldingForm
                                        symbol={symbol}
                                        onClose={() => setShowAddHolding(false)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StockCard;
