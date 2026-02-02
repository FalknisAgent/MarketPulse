import { formatCurrency, formatNumber } from '../../utils/buffettMetrics';
import './FinancialsPanel.css';

function FinancialsPanel({ financials }) {
    if (!financials) {
        return (
            <div className="financials-panel">
                <div className="financials-loading">
                    <div className="skeleton" style={{ height: 200 }}></div>
                </div>
            </div>
        );
    }

    const { financialData, keyStatistics, incomeStatements, balanceSheets, cashFlows } = financials;

    // Extract key financial metrics
    const latestIncome = incomeStatements?.[0];
    const latestBalance = balanceSheets?.[0];
    const latestCashFlow = cashFlows?.[0];

    const getValue = (obj, key) => {
        return obj?.[key]?.raw ?? obj?.[key] ?? null;
    };

    return (
        <div className="financials-panel">
            <div className="financials-grid">
                {/* Key Financial Data */}
                <div className="financial-section">
                    <h4>Key Financial Data</h4>
                    <div className="data-grid">
                        <div className="data-item">
                            <span className="data-label">Revenue (TTM)</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'totalRevenue'))}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Gross Profit</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'grossProfits'))}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Operating Income</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'operatingIncome'))}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Net Income</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'netIncomeToCommon'))}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">EBITDA</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'ebitda'))}</span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Free Cash Flow</span>
                            <span className="data-value">{formatCurrency(getValue(financialData, 'freeCashflow'))}</span>
                        </div>
                    </div>
                </div>

                {/* Profitability Margins */}
                <div className="financial-section">
                    <h4>Profitability</h4>
                    <div className="data-grid">
                        <div className="data-item">
                            <span className="data-label">Gross Margin</span>
                            <span className="data-value">
                                {getValue(financialData, 'grossMargins')
                                    ? `${(getValue(financialData, 'grossMargins') * 100).toFixed(2)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Operating Margin</span>
                            <span className="data-value">
                                {getValue(financialData, 'operatingMargins')
                                    ? `${(getValue(financialData, 'operatingMargins') * 100).toFixed(2)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Profit Margin</span>
                            <span className="data-value">
                                {getValue(financialData, 'profitMargins')
                                    ? `${(getValue(financialData, 'profitMargins') * 100).toFixed(2)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">ROE</span>
                            <span className="data-value">
                                {getValue(financialData, 'returnOnEquity')
                                    ? `${(getValue(financialData, 'returnOnEquity') * 100).toFixed(2)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">ROA</span>
                            <span className="data-value">
                                {getValue(financialData, 'returnOnAssets')
                                    ? `${(getValue(financialData, 'returnOnAssets') * 100).toFixed(2)}%`
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Balance Sheet */}
                <div className="financial-section">
                    <h4>Balance Sheet</h4>
                    <div className="data-grid">
                        <div className="data-item">
                            <span className="data-label">Total Assets</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestBalance, 'totalAssets'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Total Liabilities</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestBalance, 'totalLiab'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Stockholder Equity</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestBalance, 'totalStockholderEquity'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Cash & Equivalents</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestBalance, 'cash'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Total Debt</span>
                            <span className="data-value">
                                {formatCurrency(getValue(financialData, 'totalDebt'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Book Value/Share</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'bookValue')
                                    ? `$${getValue(keyStatistics, 'bookValue').toFixed(2)}`
                                    : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Cash Flow */}
                <div className="financial-section">
                    <h4>Cash Flow</h4>
                    <div className="data-grid">
                        <div className="data-item">
                            <span className="data-label">Operating Cash Flow</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestCashFlow, 'totalCashFromOperatingActivities'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Capital Expenditures</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestCashFlow, 'capitalExpenditures'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Dividends Paid</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestCashFlow, 'dividendsPaid'))}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Stock Repurchases</span>
                            <span className="data-value">
                                {formatCurrency(getValue(latestCashFlow, 'repurchaseOfStock'))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Valuation Metrics */}
                <div className="financial-section">
                    <h4>Valuation</h4>
                    <div className="data-grid">
                        <div className="data-item">
                            <span className="data-label">Forward P/E</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'forwardPE')?.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Trailing P/E</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'trailingPE')?.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">PEG Ratio</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'pegRatio')?.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Price/Book</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'priceToBook')?.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Price/Sales</span>
                            <span className="data-value">
                                {getValue(keyStatistics, 'priceToSalesTrailing12Months')?.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                        <div className="data-item">
                            <span className="data-label">Enterprise Value</span>
                            <span className="data-value">
                                {formatCurrency(getValue(keyStatistics, 'enterpriseValue'))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Analyst Recommendations */}
                {financials.recommendations?.length > 0 && (
                    <div className="financial-section">
                        <h4>Analyst Recommendations</h4>
                        <div className="recommendations-chart">
                            {financials.recommendations.slice(0, 1).map((rec, idx) => (
                                <div key={idx} className="recommendation-bar">
                                    <div className="rec-item rec-strong-buy" style={{ flex: rec.strongBuy || 0 }}>
                                        {rec.strongBuy > 0 && <span>{rec.strongBuy}</span>}
                                    </div>
                                    <div className="rec-item rec-buy" style={{ flex: rec.buy || 0 }}>
                                        {rec.buy > 0 && <span>{rec.buy}</span>}
                                    </div>
                                    <div className="rec-item rec-hold" style={{ flex: rec.hold || 0 }}>
                                        {rec.hold > 0 && <span>{rec.hold}</span>}
                                    </div>
                                    <div className="rec-item rec-sell" style={{ flex: rec.sell || 0 }}>
                                        {rec.sell > 0 && <span>{rec.sell}</span>}
                                    </div>
                                    <div className="rec-item rec-strong-sell" style={{ flex: rec.strongSell || 0 }}>
                                        {rec.strongSell > 0 && <span>{rec.strongSell}</span>}
                                    </div>
                                </div>
                            ))}
                            <div className="recommendation-legend">
                                <span className="legend-item"><span className="legend-dot rec-strong-buy"></span>Strong Buy</span>
                                <span className="legend-item"><span className="legend-dot rec-buy"></span>Buy</span>
                                <span className="legend-item"><span className="legend-dot rec-hold"></span>Hold</span>
                                <span className="legend-item"><span className="legend-dot rec-sell"></span>Sell</span>
                                <span className="legend-item"><span className="legend-dot rec-strong-sell"></span>Strong Sell</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FinancialsPanel;
