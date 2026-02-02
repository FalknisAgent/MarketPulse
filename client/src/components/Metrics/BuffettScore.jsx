import './BuffettScore.css';

function BuffettScore({ score }) {
    if (!score) {
        return (
            <div className="buffett-score-gauge loading">
                <div className="skeleton-circle"></div>
            </div>
        );
    }

    const { score: scoreVal } = score;

    const getScoreColor = () => {
        if (scoreVal >= 80) return 'var(--color-success)';
        if (scoreVal >= 60) return '#22c55e';
        if (scoreVal >= 40) return 'var(--color-warning)';
        return 'var(--color-danger)';
    };

    // Gauge calculations
    const radius = 80;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    // We want a semi-circle (0 to 180 degrees), so max offset is half circumference?
    // Actually, easier to use strokeDasharray for semi-circle.
    // Length of semi-circle arc = Pi * r
    const arcLength = Math.PI * normalizedRadius;
    const strokeDashoffset = arcLength - ((scoreVal / 100) * arcLength);

    return (
        <div className="buffett-score-gauge">
            <div className="gauge-wrapper">
                <svg
                    height={radius}
                    width={radius * 2}
                    viewBox={`0 0 ${radius * 2} ${radius}`}
                    className="gauge-svg"
                >
                    {/* Background Arc */}
                    <path
                        d={`M${stroke} ${radius} a ${normalizedRadius} ${normalizedRadius} 0 0 1 ${normalizedRadius * 2} 0`}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                    />
                    {/* Progress Arc */}
                    <path
                        d={`M${stroke} ${radius} a ${normalizedRadius} ${normalizedRadius} 0 0 1 ${normalizedRadius * 2} 0`}
                        fill="none"
                        stroke={getScoreColor()}
                        strokeWidth={stroke}
                        strokeDasharray={arcLength}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="gauge-progress"
                    />
                </svg>

                {/* Center Score Text */}
                <div className="gauge-value">
                    <span className="current-score" style={{ color: getScoreColor() }}>
                        {scoreVal}
                    </span>
                    <span className="max-score">/100</span>
                </div>
            </div>
        </div>
    );
}

export default BuffettScore;
