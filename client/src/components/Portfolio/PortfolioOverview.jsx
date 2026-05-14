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

        return {
            totalInvested,
            totalValue,
            totalGain,
            totalGainPct,
            totalDailyChange,
            totalRealizedGains
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

            {/* Asset Classes Card */}
            <div className="portfolio-overview-card">
                <h3 className="card-title">Your Asset Classes</h3>
                <div className="asset-classes">
                    <div className="asset-class-item">
                        <div className="asset-class-header">
                            <div className="asset-icon bg-purple">📈</div>
                            <span className="asset-name">Equities</span>
                            <span className="asset-value">{formatCurrency(metrics.totalValue)}</span>
                        </div>
                        <div className="asset-bar-bg">
                            <div className="asset-bar-fill fill-purple" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PortfolioOverview;
