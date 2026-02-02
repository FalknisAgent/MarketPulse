import { Info, CheckCircle, AlertCircle, XCircle, MinusCircle } from 'lucide-react';
import { formatPercent, formatNumber, formatCurrency } from '../../utils/buffettMetrics';
import './MetricsPanel.css';

const METRIC_INFO = {
    roe: {
        name: 'Return on Equity (ROE)',
        description: 'Measures how efficiently a company generates profits from shareholders\' equity. Buffett prefers companies with ROE consistently above 15%.',
        format: 'percent'
    },
    debtToEquity: {
        name: 'Debt-to-Equity Ratio',
        description: 'Shows the proportion of debt used to finance assets. Lower is better—Buffett prefers companies with low debt that don\'t rely heavily on borrowed money.',
        format: 'ratio'
    },
    profitMargin: {
        name: 'Net Profit Margin',
        description: 'The percentage of revenue that becomes profit. Higher margins indicate pricing power and efficient operations.',
        format: 'percent'
    },
    currentRatio: {
        name: 'Current Ratio',
        description: 'Measures ability to pay short-term obligations. A ratio above 1.5 indicates good liquidity and financial health.',
        format: 'ratio'
    },
    epsGrowth: {
        name: 'EPS Growth (5Y CAGR)',
        description: 'Compound annual growth rate of earnings per share. Buffett looks for consistent, predictable earnings growth over time.',
        format: 'percent'
    },
    freeCashFlow: {
        name: 'Free Cash Flow Yield',
        description: 'Operating cash flow minus capital expenditures, relative to market cap. Shows how much cash the business generates for shareholders.',
        format: 'percent'
    },
    priceToBook: {
        name: 'Price-to-Book Ratio',
        description: 'Stock price relative to book value per share. Lower values may indicate undervaluation—Buffett historically sought P/B below 1.5.',
        format: 'ratio'
    },
    intrinsicValue: {
        name: 'Intrinsic Value',
        description: 'Estimated true value based on discounted future cash flows. Buffett buys when price is significantly below intrinsic value (margin of safety).',
        format: 'currency'
    }
};

function MetricsPanel({ metrics, score }) {
    if (!metrics) {
        return (
            <div className="metrics-panel">
                <div className="metrics-loading">
                    <div className="skeleton" style={{ height: 100, marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 100, marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 100, marginBottom: 12 }}></div>
                </div>
            </div>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'excellent': return <CheckCircle size={18} className="metric-excellent" />;
            case 'good': return <CheckCircle size={18} className="metric-good" />;
            case 'fair': return <AlertCircle size={18} className="metric-fair" />;
            case 'poor': return <XCircle size={18} className="metric-poor" />;
            default: return <MinusCircle size={18} className="metric-unavailable" />;
        }
    };

    const formatValue = (key, metric) => {
        if (metric.value === null) return 'N/A';

        const info = METRIC_INFO[key];
        switch (info.format) {
            case 'percent':
                return formatPercent(metric.value);
            case 'ratio':
                return metric.value.toFixed(2);
            case 'currency':
                return formatCurrency(metric.value);
            default:
                return formatNumber(metric.value);
        }
    };

    const getThresholdText = (key, metric) => {
        if (metric.value === null) return '';

        const threshold = metric.threshold;
        if (!threshold) return '';

        if (metric.lowerIsBetter) {
            return `Target: < ${threshold}`;
        }
        return `Target: > ${threshold}${METRIC_INFO[key].format === 'percent' ? '%' : ''}`;
    };

    return (
        <div className="metrics-panel">
            <div className="metrics-header">
                <h4>Warren Buffett Investment Metrics</h4>
                <p>Based on value investing principles from Berkshire Hathaway</p>
            </div>

            <div className="metrics-grid">
                {Object.entries(metrics).map(([key, metric]) => (
                    <div key={key} className={`metric-card metric-${metric.status}`}>
                        <div className="metric-header">
                            <div className="metric-status">
                                {getStatusIcon(metric.status)}
                            </div>
                            <div className="metric-title">
                                <h5>{METRIC_INFO[key]?.name || key}</h5>
                                <span className="metric-threshold">{getThresholdText(key, metric)}</span>
                            </div>
                            <div className="metric-score">
                                <span className={`score-badge score-${metric.status}`}>
                                    {metric.score}/100
                                </span>
                            </div>
                        </div>

                        <div className="metric-value">
                            <span className={`value metric-${metric.status}`}>
                                {formatValue(key, metric)}
                            </span>

                            {key === 'intrinsicValue' && metric.marginOfSafety !== undefined && (
                                <span className={`margin-of-safety ${metric.undervalued ? 'price-up' : 'price-down'}`}>
                                    Margin of Safety: {metric.marginOfSafety.toFixed(1)}%
                                    {metric.undervalued ? ' (Undervalued)' : ' (Overvalued)'}
                                </span>
                            )}
                        </div>

                        <p className="metric-description">
                            {METRIC_INFO[key]?.description}
                        </p>

                        {/* Progress bar */}
                        <div className="metric-progress">
                            <div
                                className={`progress-bar progress-${metric.status}`}
                                style={{ width: `${metric.score}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MetricsPanel;
