/**
 * Warren Buffett Investment Metrics Calculator
 * 
 * Metrics and weights based on Buffett's value investing principles:
 * - ROE > 15% (consistent over years)
 * - Low Debt-to-Equity (< 0.5 ideal)
 * - High and stable profit margins
 * - Strong free cash flow
 * - Price below intrinsic value
 * - Consistent EPS growth
 * - Good liquidity (current ratio > 1.5)
 */

const METRIC_WEIGHTS = {
    roe: 0.15,           // Return on Equity
    debtToEquity: 0.15,  // Debt to Equity Ratio
    profitMargin: 0.10,  // Net Profit Margin
    currentRatio: 0.10,  // Current Ratio (liquidity)
    epsGrowth: 0.15,     // 5-year EPS CAGR
    freeCashFlow: 0.10,  // Free Cash Flow yield
    priceToBook: 0.10,   // Price to Book Value
    intrinsicValue: 0.15 // Margin of Safety (DCF)
};

/**
 * Helper to safely get value from Yahoo data structure
 * Handles both { raw: value } and direct value
 */
function getVal(obj, path) {
    if (!obj) return null;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return null;
        current = current[part];
    }

    if (current === null || current === undefined) return null;
    return (current.raw !== undefined) ? current.raw : current;
}

/**
 * Calculate Return on Equity
 * Good: > 15%, Excellent: > 20%
 */
export function calculateROE(financials) {
    try {
        // Prefer already calculated ROE from Yahoo
        let roe = getVal(financials, 'financialData.returnOnEquity');

        // If Yahoo provides it as a decimal (0.15 for 15%), convert to percent
        // If it's something like 1.5 (150% for Apple), it's also a decimal
        if (roe !== null) {
            roe = roe * 100;
        } else {
            // Manual calculation
            const netIncome = getVal(financials, 'financialData.netIncomeToCommon') ||
                getVal(financials, 'incomeStatements.0.netIncome');
            const shareholdersEquity = getVal(financials, 'balanceSheets.0.totalStockholderEquity');

            if (netIncome === null || shareholdersEquity === null || shareholdersEquity <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }
            roe = (netIncome / shareholdersEquity) * 100;
        }

        let score = 0;
        let status = 'poor';

        if (roe >= 20) {
            score = 100;
            status = 'excellent';
        } else if (roe >= 15) {
            score = 80;
            status = 'good';
        } else if (roe >= 10) {
            score = 50;
            status = 'fair';
        } else if (roe >= 5) {
            score = 25;
            status = 'poor';
        }

        return { value: roe, score, status, threshold: 15 };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate Debt to Equity Ratio
 * Good: < 0.5, Acceptable: < 1.0
 */
export function calculateDebtToEquity(financials) {
    try {
        // Yahoo provides debtToEquity in percent (e.g. 102.63) or ratio
        let debtToEquity = getVal(financials, 'financialData.debtToEquity');

        if (debtToEquity !== null) {
            // If it's > 5, it's likely a percentage (e.g. 102.63)
            if (debtToEquity > 5) {
                debtToEquity = debtToEquity / 100;
            }
        } else {
            // Manual calculation
            const totalDebt = getVal(financials, 'financialData.totalDebt') ||
                (getVal(financials, 'balanceSheets.0.longTermDebt') || 0) +
                (getVal(financials, 'balanceSheets.0.shortLongTermDebt') || 0);
            const shareholdersEquity = getVal(financials, 'balanceSheets.0.totalStockholderEquity');

            if (shareholdersEquity === null || shareholdersEquity <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            debtToEquity = totalDebt / shareholdersEquity;
        }

        let score = 0;
        let status = 'poor';

        if (debtToEquity <= 0.3) {
            score = 100;
            status = 'excellent';
        } else if (debtToEquity <= 0.5) {
            score = 80;
            status = 'good';
        } else if (debtToEquity <= 1.0) {
            score = 50;
            status = 'fair';
        } else if (debtToEquity <= 2.0) {
            score = 25;
            status = 'poor';
        }

        return { value: debtToEquity, score, status, threshold: 0.5, lowerIsBetter: true };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate Net Profit Margin
 * Good: > 10%, Excellent: > 20%
 */
export function calculateProfitMargin(financials) {
    try {
        let margin = getVal(financials, 'financialData.profitMargins');

        if (margin !== null) {
            margin = margin * 100;
        } else {
            const netIncome = getVal(financials, 'incomeStatements.0.netIncome') ||
                getVal(financials, 'financialData.netIncomeToCommon');
            const revenue = getVal(financials, 'incomeStatements.0.totalRevenue') ||
                getVal(financials, 'financialData.totalRevenue');

            if (netIncome === null || revenue === null || revenue <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            margin = (netIncome / revenue) * 100;
        }

        let score = 0;
        let status = 'poor';

        if (margin >= 20) {
            score = 100;
            status = 'excellent';
        } else if (margin >= 10) {
            score = 80;
            status = 'good';
        } else if (margin >= 5) {
            score = 50;
            status = 'fair';
        } else if (margin > 0) {
            score = 25;
            status = 'poor';
        }

        return { value: margin, score, status, threshold: 10 };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate Current Ratio (liquidity)
 * Good: > 1.5, Excellent: > 2.0
 */
export function calculateCurrentRatio(financials) {
    try {
        let ratio = getVal(financials, 'financialData.currentRatio');

        if (ratio === null) {
            const currentAssets = getVal(financials, 'balanceSheets.0.totalCurrentAssets');
            const currentLiabilities = getVal(financials, 'balanceSheets.0.totalCurrentLiabilities');

            if (currentAssets === null || currentLiabilities === null || currentLiabilities <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            ratio = currentAssets / currentLiabilities;
        }

        let score = 0;
        let status = 'poor';

        if (ratio >= 2.0) {
            score = 100;
            status = 'excellent';
        } else if (ratio >= 1.5) {
            score = 80;
            status = 'good';
        } else if (ratio >= 1.0) {
            score = 50;
            status = 'fair';
        } else {
            score = 0;
            status = 'poor';
        }

        return { value: ratio, score, status, threshold: 1.5 };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate 5-year EPS Growth (CAGR)
 * Good: > 10%, Excellent: > 15%
 */
export function calculateEPSGrowth(financials) {
    try {
        // Prefer earningsGrowth from financialData
        let growth = getVal(financials, 'financialData.earningsGrowth');
        if (growth !== null) {
            return scoreEPSGrowth(growth * 100);
        }

        const earningsHistory = financials.earningsHistory || [];

        if (earningsHistory.length < 4) {
            // Try to calculate from income statements
            const statements = financials.incomeStatements || [];
            if (statements.length < 2) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            const latestEPS = getVal(statements[0], 'dilutedEPS');
            const oldestEPS = getVal(statements[statements.length - 1], 'dilutedEPS');
            const years = statements.length;

            if (latestEPS === null || oldestEPS === null || oldestEPS <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            const cagr = (Math.pow(latestEPS / oldestEPS, 1 / years) - 1) * 100;
            return scoreEPSGrowth(cagr);
        }

        const firstEPS = getVal(earningsHistory[earningsHistory.length - 1], 'epsActual');
        const lastEPS = getVal(earningsHistory[0], 'epsActual');
        const years = earningsHistory.length / 4; // Quarterly data

        if (firstEPS === null || lastEPS === null || firstEPS <= 0) {
            return { value: null, score: 0, status: 'unavailable' };
        }

        const cagr = (Math.pow(lastEPS / firstEPS, 1 / years) - 1) * 100;
        return scoreEPSGrowth(cagr);
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

function scoreEPSGrowth(cagr) {
    let score = 0;
    let status = 'poor';

    if (cagr >= 15) {
        score = 100;
        status = 'excellent';
    } else if (cagr >= 10) {
        score = 80;
        status = 'good';
    } else if (cagr >= 5) {
        score = 50;
        status = 'fair';
    } else if (cagr > 0) {
        score = 25;
        status = 'poor';
    }

    return { value: cagr, score, status, threshold: 10 };
}

/**
 * Calculate Free Cash Flow Yield
 * Good: > 5%, Excellent: > 8%
 */
export function calculateFreeCashFlow(financials, quote) {
    try {
        // Prefer already calculated Yield from Yahoo if available
        let yieldVal = getVal(financials, 'financialData.freeCashflow') / getVal(financials, 'financialData.totalRevenue');
        // Actually Yahoo provides yield is usually calculated vs market cap

        const fcf = getVal(financials, 'financialData.freeCashflow') ||
            (getVal(financials, 'cashFlows.0.totalCashFromOperatingActivities') || 0) -
            Math.abs(getVal(financials, 'cashFlows.0.capitalExpenditures') || 0);

        const marketCap = getVal(quote, 'marketCap') || getVal(financials, 'financialData.marketCap');

        if (fcf === null || marketCap === null || marketCap <= 0) {
            return { value: null, score: 0, status: 'unavailable' };
        }

        const fcfYield = (fcf / marketCap) * 100;

        let score = 0;
        let status = 'poor';

        if (fcfYield >= 8) {
            score = 100;
            status = 'excellent';
        } else if (fcfYield >= 5) {
            score = 80;
            status = 'good';
        } else if (fcfYield >= 2) {
            score = 50;
            status = 'fair';
        } else if (fcfYield > 0) {
            score = 25;
            status = 'poor';
        }

        return { value: fcfYield, score, status, threshold: 5, fcf };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate Price to Book Ratio
 * Good: < 1.5, Excellent: < 1.0
 */
export function calculatePriceToBook(financials, quote) {
    try {
        let pb = getVal(financials, 'keyStatistics.priceToBook');

        if (pb === null) {
            const bookValue = getVal(financials, 'keyStatistics.bookValue');
            const price = getVal(quote, 'price');

            if (bookValue === null || price === null || bookValue <= 0) {
                return { value: null, score: 0, status: 'unavailable' };
            }

            pb = price / bookValue;
        }

        let score = 0;
        let status = 'poor';

        if (pb <= 1.0) {
            score = 100;
            status = 'excellent';
        } else if (pb <= 1.5) {
            score = 80;
            status = 'good';
        } else if (pb <= 3.0) {
            score = 50;
            status = 'fair';
        } else if (pb <= 5.0) {
            score = 25;
            status = 'poor';
        }

        return { value: pb, score, status, threshold: 1.5, lowerIsBetter: true };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate Intrinsic Value using simplified DCF
 * Margin of Safety: Price should be below intrinsic value
 */
export function calculateIntrinsicValue(financials, quote) {
    try {
        // Get EPS
        const eps = getVal(quote, 'eps') ||
            getVal(financials, 'keyStatistics.trailingEps') ||
            getVal(financials, 'earnings.financialsChart.yearly.slice(-1).0.earnings');

        let growthRate = getVal(financials, 'financialData.earningsGrowth') || 0.10; // Default 10%
        const discountRate = 0.10; // 10% required return
        const terminalGrowth = 0.03; // 3% terminal growth
        const years = 10;

        if (eps === null || eps <= 0) {
            return { value: null, score: 0, status: 'unavailable' };
        }

        // Calculate future cash flows
        let totalPV = 0;
        for (let i = 1; i <= years; i++) {
            const futureEPS = eps * Math.pow(1 + Math.min(growthRate, 0.25), i);
            const pv = futureEPS / Math.pow(1 + discountRate, i);
            totalPV += pv;
        }

        // Terminal value
        const terminalEPS = eps * Math.pow(1 + Math.min(growthRate, 0.25), years);
        const terminalValue = (terminalEPS * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
        const terminalPV = terminalValue / Math.pow(1 + discountRate, years);

        const intrinsicValue = totalPV + terminalPV;
        const price = getVal(quote, 'price');

        if (price === null) return { value: null, score: 0, status: 'unavailable' };

        const marginOfSafety = ((intrinsicValue - price) / intrinsicValue) * 100;

        let score = 0;
        let status = 'poor';

        if (marginOfSafety >= 30) {
            score = 100;
            status = 'excellent';
        } else if (marginOfSafety >= 15) {
            score = 80;
            status = 'good';
        } else if (marginOfSafety >= 0) {
            score = 50;
            status = 'fair';
        } else if (marginOfSafety >= -20) {
            score = 25;
            status = 'poor';
        }

        return {
            value: intrinsicValue,
            score,
            status,
            marginOfSafety,
            price,
            undervalued: marginOfSafety > 0
        };
    } catch {
        return { value: null, score: 0, status: 'unavailable' };
    }
}

/**
 * Calculate overall Buffett Score
 */
export function calculateBuffettScore(financials, quote) {
    // Return default score if no financials data
    if (!financials) {
        return {
            score: 0,
            recommendation: 'unavailable',
            recommendationText: 'Unable to calculate - No financial data available',
            metrics: {},
            availableMetrics: 0,
            totalMetrics: 8
        };
    }

    const metrics = {
        roe: calculateROE(financials),
        debtToEquity: calculateDebtToEquity(financials),
        profitMargin: calculateProfitMargin(financials),
        currentRatio: calculateCurrentRatio(financials),
        epsGrowth: calculateEPSGrowth(financials),
        freeCashFlow: calculateFreeCashFlow(financials, quote),
        priceToBook: calculatePriceToBook(financials, quote),
        intrinsicValue: calculateIntrinsicValue(financials, quote)
    };

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(metrics).forEach(([key, metric]) => {
        const weight = METRIC_WEIGHTS[key];
        if (metric.value !== null) {
            totalScore += metric.score * weight;
            totalWeight += weight;
        }
    });

    // Normalize score based on available metrics
    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    // Determine recommendation
    let recommendation = 'pass';
    let recommendationText = 'Pass - Does not meet value criteria';

    if (finalScore >= 80) {
        recommendation = 'strongBuy';
        recommendationText = 'Strong Buy - Excellent value investment';
    } else if (finalScore >= 60) {
        recommendation = 'consider';
        recommendationText = 'Consider - Good potential, do more research';
    } else if (finalScore >= 40) {
        recommendation = 'hold';
        recommendationText = 'Hold - Fair value, not compelling';
    }

    return {
        score: finalScore,
        recommendation,
        recommendationText,
        metrics,
        availableMetrics: Object.values(metrics).filter(m => m.value !== null).length,
        totalMetrics: Object.keys(metrics).length
    };
}

/**
 * Format currency
 */
export function formatCurrency(value, currency = 'USD') {
    if (value === null || value === undefined) return 'N/A';

    if (Math.abs(value) >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
    } else if (Math.abs(value) >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1e3) {
        return `$${(value / 1e3).toFixed(2)}K`;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value, decimals = 2) {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format number
 */
export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return 'N/A';

    if (Math.abs(value) >= 1e9) {
        return `${(value / 1e9).toFixed(decimals)}B`;
    } else if (Math.abs(value) >= 1e6) {
        return `${(value / 1e6).toFixed(decimals)}M`;
    } else if (Math.abs(value) >= 1e3) {
        return `${(value / 1e3).toFixed(decimals)}K`;
    }

    return value.toFixed(decimals);
}
