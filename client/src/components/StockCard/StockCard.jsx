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

    // Error State
    if (error) {
        return (
            <div className="stock-card stock-card-error">
                <div className="card-header-row error-layout">
                    <div className="stock-info">
                        <div className="stock-symbol">{symbol}</div>
                        <div className="stock-name">Error loading data</div>
                    </div>
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
            {/* Header Layout matches Lovable Screenshot */}
            <div className="card-header-row">

                {/* 1. Symbol & Name */}
                <div className="stock-info-section" onClick={handleToggleExpand}>
                    <div className="stock-symbol">{symbol}</div>
                    <div className="stock-name">{quote?.shortName || quote?.longName || 'Loading...'}</div>
                </div>

                {/* 2. Price & Change */}
                <div className="stock-price-section" onClick={handleToggleExpand}>
                    {isLoading ? (
                        <div className="skeleton" style={{ width: 100, height: 24 }}></div>
                    ) : quote?.price ? (
                        <>
                            <span className="current-price">${quote.price.toFixed(2)}</span>
                            <span className={`price-change-badge ${getPriceChangeClass()}`}>
                                {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
                            </span>
                        </>
                    ) : (
                        <span className="text-muted">--</span>
                    )}
                </div>

                {/* 3. Buffett Score Badge (Right Aligned) */}
                <div className="score-section" onClick={handleToggleExpand}>
                    {buffettScore?.score !== undefined && (
                        <div className={`buffett-badge-circle ${getScoreClass()}`}>
                            {buffettScore.score}
                        </div>
                    )}
                </div>

                {/* 4. Actions */}
                <div className="card-actions-section">
                    <button className="action-btn" onClick={handleRefresh} disabled={isLoading} title="Refresh">
                        <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
                    </button>
                    <button className="action-btn" onClick={handleRemove} title="Remove">
                        <X size={18} />
                    </button>
                    <button className="action-btn expand-toggle" onClick={handleToggleExpand}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content with Tabs */}
            {isExpanded && (
                <div className="card-expanded-content">
                    {/* Tabs Navigation */}
                    <div className="card-tabs">
                        {['overview', 'financials', 'buffett metrics', 'chart'].map((tab) => (
                            <button
                                key={tab}
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                        {showHoldings && (
                            <button
                                className={`tab-btn ${activeTab === 'holdings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('holdings')}
                            >
                                Holdings
                            </button>
                        )}
                    </div>

                    {/* Tab Content Areas */}
                    <div className="tab-panel">
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="overview-layout">
                                {/* Left: Score Visualization */}
                                <div className="score-viz-panel">
                                    <div className="score-label-small">BUFFETT SCORE</div>
                                    <BuffettScore score={buffettScore} />
                                    {buffettScore?.score < 40 && (
                                        <div className="score-status-message fail">
                                            <X size={14} /> Pass - Does not meet value criteria
                                        </div>
                                    )}
                                    <div className="metrics-analyzed">8/8 metrics analyzed</div>
                                </div>

                                {/* Right: Usage Stats */}
                                <div className="key-stats-panel">
                                    <div className="section-label">KEY STATISTICS</div>
                                    <div className="stats-grid-clean">
                                        <div className="stat-box">
                                            <div className="lbl">MARKET CAP</div>
                                            <div className="val">{formatCurrency(quote?.marketCap)}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">P/E RATIO</div>
                                            <div className="val">{quote?.peRatio?.toFixed(2) || '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">EPS</div>
                                            <div className="val">${quote?.eps?.toFixed(2) || '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">DIVIDEND YIELD</div>
                                            <div className="val">{quote?.dividendYield ? formatPercent(quote.dividendYield * 100) : '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">52W HIGH</div>
                                            <div className="val">${quote?.fiftyTwoWeekHigh?.toFixed(2) || '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">52W LOW</div>
                                            <div className="val">${quote?.fiftyTwoWeekLow?.toFixed(2) || '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">VOLUME</div>
                                            <div className="val">{quote?.volume?.toLocaleString() || '-'}</div>
                                        </div>
                                        <div className="stat-box">
                                            <div className="lbl">AVG VOLUME</div>
                                            <div className="val">{quote?.avgVolume?.toLocaleString() || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && <FinancialsPanel financials={stockData?.financials} />}

                        {activeTab === 'buffett metrics' && (
                            <MetricsPanel metrics={buffettScore?.metrics} score={buffettScore} />
                        )}

                        {activeTab === 'chart' && (
                            <PriceChart symbol={symbol} historicalData={stockData?.historical} />
                        )}

                        {activeTab === 'holdings' && showHoldings && (
                            <div className="holdings-panel-clean">
                                <div className="holdings-header-clean">
                                    <h4>Your Positions</h4>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddHolding(true)}>
                                        <PlusCircle size={16} /> Add Position
                                    </button>
                                </div>

                                {holdings.length === 0 ? (
                                    <div className="empty-holdings">
                                        <p>No active positions.</p>
                                    </div>
                                ) : (
                                    <div className="holdings-list-clean">
                                        {holdings.map(h => (
                                            <div key={h.id} className="holding-row">
                                                <div className="h-info">
                                                    <span className="h-shares">{h.shares} shares</span>
                                                    <span className="h-price">@ ${h.buyPrice.toFixed(2)}</span>
                                                </div>
                                                <button className="btn-icon-sm" onClick={() => actions.removeHolding(h.id)}><X size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {showAddHolding && (
                                    <HoldingForm symbol={symbol} onClose={() => setShowAddHolding(false)} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockCard;
