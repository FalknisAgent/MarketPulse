const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({
    validation: { logErrors: false, logOptionsErrors: false, allowAdditionalProps: true }
});

const symbol = 'PBR';
const modules = [
    'financialData',
    'defaultKeyStatistics',
    'assetProfile',
    'summaryDetail',
    'incomeStatementHistory',
    'incomeStatementHistoryQuarterly',
    'balanceSheetHistory',
    'balanceSheetHistoryQuarterly',
    'cashflowStatementHistory',
    'cashflowStatementHistoryQuarterly'
];

async function testModules() {
    for (const module of modules) {
        try {
            console.log(`Testing module: ${module}`);
            await yahooFinance.quoteSummary(symbol, { modules: [module] });
            console.log(`✅ ${module} OK`);
        } catch (e) {
            console.error(`❌ ${module} FAILED: ${e.message}`);
        }
    }
}

testModules();
