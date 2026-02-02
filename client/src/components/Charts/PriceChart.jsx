import { useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Area, AreaChart
} from 'recharts';
import './PriceChart.css';

const PERIODS = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' },
    { value: 'max', label: 'MAX' }
];

function PriceChart({ symbol, historicalData }) {
    const [period, setPeriod] = useState('1y');

    const chartData = useMemo(() => {
        if (!historicalData?.quotes) return [];

        const quotes = historicalData.quotes;
        const now = new Date();
        let startDate;

        switch (period) {
            case '1m':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case '3m':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case '6m':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                break;
            case '1y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case '5y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 5));
                break;
            default:
                startDate = new Date(0);
        }

        return quotes
            .filter(q => new Date(q.date) >= startDate && q.close)
            .map(q => ({
                date: new Date(q.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: period === 'max' || period === '5y' ? '2-digit' : undefined
                }),
                fullDate: new Date(q.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                price: q.close,
                volume: q.volume
            }));
    }, [historicalData, period]);

    const priceChange = useMemo(() => {
        if (chartData.length < 2) return { value: 0, percent: 0 };
        const first = chartData[0].price;
        const last = chartData[chartData.length - 1].price;
        return {
            value: last - first,
            percent: ((last - first) / first) * 100
        };
    }, [chartData]);

    const isPositive = priceChange.value >= 0;

    if (!historicalData) {
        return (
            <div className="price-chart">
                <div className="chart-loading">
                    <div className="skeleton" style={{ height: 300 }}></div>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p className="tooltip-date">{payload[0].payload.fullDate}</p>
                    <p className="tooltip-price">
                        ${payload[0].value.toFixed(2)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="price-chart">
            <div className="chart-header">
                <div className="chart-info">
                    <span className="chart-symbol">{symbol}</span>
                    <span className={`chart-change ${isPositive ? 'price-up' : 'price-down'}`}>
                        {isPositive ? '+' : ''}{priceChange.value.toFixed(2)}
                        ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                    </span>
                </div>

                <div className="period-selector">
                    {PERIODS.map(p => (
                        <button
                            key={p.value}
                            className={`period-btn ${period === p.value ? 'active' : ''}`}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="0%"
                                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="100%"
                                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--color-border)' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => `$${value.toFixed(0)}`}
                            width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke={isPositive ? '#10b981' : '#ef4444'}
                            strokeWidth={2}
                            fill={`url(#gradient-${symbol})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default PriceChart;
