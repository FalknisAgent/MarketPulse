import { TrendingUp, ShieldCheck, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import './BuffettScore.css';

function BuffettScore({ score }) {
    if (!score) {
        return (
            <div className="buffett-score-card loading">
                <div className="skeleton" style={{ width: '100%', height: 200 }}></div>
            </div>
        );
    }

    const getScoreColor = () => {
        if (score.score >= 80) return 'var(--color-success)';
        if (score.score >= 60) return '#22c55e';
        if (score.score >= 40) return 'var(--color-warning)';
        return 'var(--color-danger)';
    };

    const getRecommendationIcon = () => {
        switch (score.recommendation) {
            case 'strongBuy': return <ShieldCheck size={24} />;
            case 'consider': return <TrendingUp size={24} />;
            case 'hold': return <HelpCircle size={24} />;
            default: return <XCircle size={24} />;
        }
    };

    const getRecommendationClass = () => {
        switch (score.recommendation) {
            case 'strongBuy': return 'excellent';
            case 'consider': return 'good';
            case 'hold': return 'fair';
            default: return 'poor';
        }
    };

    // Calculate gauge arc
    const radius = 70;
    const circumference = Math.PI * radius; // Half circle
    const offset = circumference - (score.score / 100) * circumference;

    return (
        <div className="buffett-score-card">
            <h4>Buffett Score</h4>

            <div className="score-gauge">
                <svg viewBox="0 0 160 100" className="gauge-svg">
                    {/* Background arc */}
                    <path
                        d="M 10 90 A 70 70 0 0 1 150 90"
                        fill="none"
                        stroke="var(--color-bg-tertiary)"
                        strokeWidth="12"
                        strokeLinecap="round"
                    />
                    {/* Value arc */}
                    <path
                        d="M 10 90 A 70 70 0 0 1 150 90"
                        fill="none"
                        stroke={getScoreColor()}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                            transition: 'stroke-dashoffset 1s ease-out',
                            filter: `drop-shadow(0 0 8px ${getScoreColor()}40)`
                        }}
                    />
                </svg>

                <div className="score-value">
                    <span className="score-number" style={{ color: getScoreColor() }}>
                        {score.score}
                    </span>
                    <span className="score-max">/100</span>
                </div>
            </div>

            <div className={`recommendation recommendation-${getRecommendationClass()}`}>
                {getRecommendationIcon()}
                <span>{score.recommendationText}</span>
            </div>

            <div className="metrics-summary">
                <span>{score.availableMetrics}/{score.totalMetrics} metrics analyzed</span>
            </div>
        </div>
    );
}

export default BuffettScore;
