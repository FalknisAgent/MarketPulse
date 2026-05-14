import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './PortfolioChart.css';

function PortfolioChart() {
    const { state, actions } = useApp();
    const { portfolio, stockData, selectedCurrency } = state;
    const [period, setPeriod] = useState('1M'); // 1W, 1M, YTD, 1Y, 5Y, MAX

    const chartData = useMemo(() => {
        if (portfolio.length === 0) return [];

        // Determine date range based on period
        const now = new Date();
        const past = new Date();
        if (period === '1W') past.setDate(now.getDate() - 7);
        else if (period === '1M') past.setMonth(now.getMonth() - 1);
        else if (period === 'YTD') { past.setMonth(0); past.setDate(1); }
        else if (period === '1Y') past.setFullYear(now.getFullYear() - 1);
        else if (period === '5Y') past.setFullYear(now.getFullYear() - 5);
        else if (period === 'MAX') past.setFullYear(1970); // Effectively max

        const startDate = past.toISOString().split('T')[0];
        
        // Collect all unique dates in the range from all historical data of portfolio symbols
        const datesSet = new Set();
        const symbols = [...new Set(portfolio.map(tx => tx.symbol))];
        
        symbols.forEach(symbol => {
            const historical = stockData[symbol]?.historical?.quotes;
            if (historical) {
                historical.forEach(q => {
                    const qDate = new Date(q.date).toISOString().split('T')[0];
                    if (qDate >= startDate && qDate <= now.toISOString().split('T')[0]) {
                        datesSet.add(qDate);
                    }
                });
            }
        });

        const sortedDates = Array.from(datesSet).sort();
        if (sortedDates.length === 0) return [];

        // Build data array
        const data = sortedDates.map(dateStr => {
            let dailyTotalValue = 0;
            const currentDate = new Date(dateStr);

            symbols.forEach(symbol => {
                // Calculate shares held of this symbol on this date
                const txs = portfolio.filter(tx => tx.symbol === symbol && new Date(tx.date) <= currentDate);
                const sharesHeld = txs.reduce((sum, tx) => tx.type === 'SELL' ? sum - tx.shares : sum + tx.shares, 0);

                if (sharesHeld > 0) {
                    // Find closing price on this date or closest previous date
                    const historical = stockData[symbol]?.historical?.quotes || [];
                    const stockCurrency = stockData[symbol]?.quote?.currency || 'USD';
                    
                    let price = null;
                    for (let i = historical.length - 1; i >= 0; i--) {
                        if (new Date(historical[i].date) <= currentDate) {
                            price = historical[i].close;
                            break;
                        }
                    }

                    if (price) {
                        const val = sharesHeld * price;
                        const valInSelected = actions.convertPrice(val, stockCurrency);
                        dailyTotalValue += (valInSelected || 0);
                    }
                }
            });

            return {
                date: dateStr,
                value: dailyTotalValue
            };
        });

        return data;
    }, [portfolio, stockData, period, selectedCurrency, actions]);

    const formatXAxis = (tickItem) => {
        const date = new Date(tickItem);
        if (period === '1W' || period === '1M') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    };

    const formatTooltip = (value) => {
        return [new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(value), 'Portfolio Value'];
    };

    if (portfolio.length === 0) {
        return <div className="portfolio-chart-empty">Add transactions to see performance</div>;
    }

    const firstVal = chartData.length > 0 ? chartData[0].value : 0;
    const lastVal = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
    const diff = lastVal - firstVal;
    const pct = firstVal > 0 ? (diff / firstVal) * 100 : 0;

    return (
        <div className="portfolio-chart-container">
            <div className="chart-header">
                <div>
                    <h3 className="chart-title">Performance</h3>
                    <div className={`chart-stats ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                        {diff >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(diff)} ({diff >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                    </div>
                </div>
                <div className="chart-filters">
                    {['1W', '1M', 'YTD', '1Y', '5Y', 'MAX'].map(p => (
                        <button 
                            key={p} 
                            className={`filter-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="chart-body" style={{ width: '100%', height: 300 }}>
                {chartData.length > 0 ? (
                    <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={formatXAxis} 
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis 
                                domain={['dataMin - (dataMin * 0.05)', 'dataMax + (dataMax * 0.05)']}
                                tickFormatter={(val) => {
                                    const sym = actions.getCurrencySymbol(selectedCurrency);
                                    if (val >= 1000) return `${sym}${(val/1000).toFixed(1)}k`;
                                    return `${sym}${val.toFixed(0)}`;
                                }}
                                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={60}
                            />
                            <Tooltip 
                                formatter={formatTooltip}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} 
                                strokeWidth={2} 
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="chart-loading">No historical data available for this period.</div>
                )}
            </div>
        </div>
    );
}

export default PortfolioChart;
