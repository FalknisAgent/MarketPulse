import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import PortfolioChart from './PortfolioChart';
import './PortfolioOverview.css';

function PortfolioOverview() {
    const { state, actions } = useApp();
    const { portfolio, stockData, selectedCurrency } = state;

    const metrics = useMemo(() => {
        let totalInvested = 0;
        let totalValue = 0;
        let totalDailyChange = 0;
        let totalRealizedGains = 0;

        // Group transactions by symbol
        const symbols = [...new Set(portfolio.map(tx => tx.symbol))];

        symbols.forEach(symbol => {
            const txs = portfolio.filter(t => t.symbol === symbol).sort((a,b) => new Date(a.date) - new Date(b.date));
            const stock = stockData[symbol];
            const stockCurrency = stock?.quote?.currency || 'USD';

            let shares = 0;
            let costBasis = 0;
            let realized = 0;

            txs.forEach(tx => {
                if (tx.type === 'SELL') {
                    const avgCost = shares > 0 ? (costBasis / shares) : 0;
                    shares -= tx.shares;
                    costBasis -= (tx.shares * avgCost);
                    
                    // Realized gain = Net Proceeds - Cost Basis of shares sold
                    const netProceeds = (tx.shares * tx.price) - (tx.fees || 0) - (tx.tax || 0);
                    realized += netProceeds - (tx.shares * avgCost);
                } else {
                    // BUY
                    shares += tx.shares;
                    costBasis += (tx.shares * tx.price) + (tx.fees || 0) + (tx.tax || 0);
                }
            });

            // Convert to selected currency
            const investedInSelected = actions.convertPrice(costBasis, stockCurrency);
            totalInvested += investedInSelected || 0;

            const realizedInSelected = actions.convertPrice(realized, stockCurrency);
            totalRealizedGains += realizedInSelected || 0;

            // Only calculate current value & daily change for remaining active shares
            if (shares > 0) {
                const currentPrice = stock?.quote?.price !== undefined ? stock.quote.price : (costBasis / shares);
                const holdingValue = shares * currentPrice;
                const valueInSelected = actions.convertPrice(holdingValue, stockCurrency);
                totalValue += valueInSelected || 0;

                const dailyChange = stock?.quote?.change || 0;
                const holdingDailyChange = shares * dailyChange;
                const changeInSelected = actions.convertPrice(holdingDailyChange, stockCurrency);
                totalDailyChange += changeInSelected || 0;
            }
        });

        const totalGain = totalValue - totalInvested;
        const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

        let allocations = [];
        symbols.forEach(symbol => {
            const txs = portfolio.filter(t => t.symbol === symbol);
            let shares = 0;
            let costBasis = 0;
            txs.forEach(tx => {
                if (tx.type === 'SELL') {
                    const avgCost = shares > 0 ? (costBasis / shares) : 0;
                    shares -= tx.shares;
                    costBasis -= (tx.shares * avgCost);
                } else {
                    shares += tx.shares;
                    costBasis += (tx.shares * tx.price) + (tx.fees || 0) + (tx.tax || 0);
                }
            });
            if (shares > 0) {
                const stock = stockData[symbol];
                const stockCurrency = stock?.quote?.currency || 'USD';
                const currentPrice = stock?.quote?.price !== undefined ? stock.quote.price : (costBasis / shares);
                const holdingValue = shares * currentPrice;
                const valueInSelected = actions.convertPrice(holdingValue, stockCurrency) || 0;
                
                allocations.push({
                    symbol,
                    value: valueInSelected,
                    percentage: totalValue > 0 ? (valueInSelected / totalValue) * 100 : 0
                });
            }
        });
        
        // Sort allocations by value descending
        allocations.sort((a, b) => b.value - a.value);

        return {
            totalInvested,
            totalValue,
            totalGain,
            totalGainPct,
            totalDailyChange,
            totalRealizedGains,
            allocations
        };
    }, [portfolio, stockData, state.fxRates, selectedCurrency, actions]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedCurrency,
            minimumFractionDigits: 2
        }).format(val || 0);
    };

    const formatPct = (val) => {
        return (val >= 0 ? '+' : '') + (val || 0).toFixed(2) + '%';
    };

    // Calculate stroke offset for gauge based on gain percentage
    const circumference = 251.2; // Math.PI * 80
    // We visually represent the gauge as mostly filled, e.g., 70% filled
    const strokeDashoffset = circumference * 0.3; 
    
    return (
        <div className="portfolio-overview">
            <div className="portfolio-overview-card">
                {/* Gauge Section */}
                <div className="portfolio-gauge-container">
                    <svg className="portfolio-gauge" viewBox="0 0 200 120">
                        {/* Define Gradients */}
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                                <stop offset="50%" stopColor="#f59e0b" /> {/* Amber */}
                                <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
                            </linearGradient>
                        </defs>
                        {/* Background Arc */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="var(--color-bg-hover)"
                            strokeWidth="16"
                            strokeLinecap="round"
                        />
                        {/* Value Arc */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="16"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="gauge-value-path"
                        />
                    </svg>
                    
                    <div className="gauge-content">
                        <div className="gauge-total-value">
                            {formatCurrency(metrics.totalValue)}
                        </div>
                        <div className={`gauge-total-gain ${metrics.totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                            {metrics.totalGain >= 0 ? '+' : ''}{formatCurrency(metrics.totalGain)} 
                            <span className="gauge-gain-pct">{formatPct(metrics.totalGainPct)}</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="portfolio-metrics-grid">
                    <div className="metric-box">
                        <div className="metric-label">Invested</div>
                        <div className="metric-value">{formatCurrency(metrics.totalInvested)}</div>
                    </div>
                    <div className="metric-box">
                        <div className="metric-label">Daily Change</div>
                        <div className={`metric-value ${metrics.totalDailyChange >= 0 ? 'text-success' : 'text-danger'}`}>
                            {metrics.totalDailyChange >= 0 ? '+' : ''}{formatCurrency(metrics.totalDailyChange)}
                        </div>
                    </div>
                    <div className="metric-box">
                        <div className="metric-label">Realized Gains</div>
                        <div className={`metric-value ${metrics.totalRealizedGains >= 0 ? 'text-success' : 'text-danger'}`}>
                            {metrics.totalRealizedGains >= 0 ? '+' : ''}{formatCurrency(metrics.totalRealizedGains)}
                        </div>
                    </div>
                    <div className="metric-box disabled">
                        <div className="metric-label">Dividends</div>
                        <div className="metric-value text-muted">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Chart */}
            <PortfolioChart />

            {/* Asset Allocation Card */}
            <div className="portfolio-overview-card">
                <h3 className="card-title">Portfolio Allocation</h3>
                <div className="asset-classes">
                    {metrics.allocations.length === 0 ? (
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>No active positions.</div>
                    ) : (
                        metrics.allocations.map((alloc, index) => {
                            // Assign a distinct color based on index
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                            const color = colors[index % colors.length];
                            
                            return (
                                <div key={alloc.symbol} className="asset-class-item">
                                    <div className="asset-class-header">
                                        <div className="asset-icon" style={{ backgroundColor: `${color}20`, color: color }}>
                                            {alloc.symbol.charAt(0)}
                                        </div>
                                        <span className="asset-name">{alloc.symbol}</span>
                                        <div style={{ flex: 1, textAlign: 'right', marginRight: '16px', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {alloc.percentage.toFixed(1)}%
                                        </div>
                                        <span className="asset-value">{formatCurrency(alloc.value)}</span>
                                    </div>
                                    <div className="asset-bar-bg">
                                        <div className="asset-bar-fill" style={{ width: `${alloc.percentage}%`, backgroundColor: color }}></div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default PortfolioOverview;
