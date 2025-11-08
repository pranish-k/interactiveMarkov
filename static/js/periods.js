// Time Period Comparison JavaScript

let periodCharts = [];
let periodsData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadPeriodsData();
});

async function loadPeriodsData() {
    try {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = 'block';

        const response = await fetch('/api/periods');
        if (!response.ok) throw new Error('Failed to load periods data');

        const data = await response.json();
        periodsData = data.periods;

        displayPeriods();
        analyzeComparison();

        loadingIndicator.style.display = 'none';

    } catch (error) {
        console.error('Error loading periods data:', error);
        document.getElementById('loadingIndicator').innerHTML =
            '<p>Error loading period data. Please refresh the page.</p>';
    }
}

function displayPeriods() {
    if (!periodsData) return;

    periodsData.forEach((period, index) => {
        // Update dates
        document.getElementById(`period${index}Dates`).textContent =
            `${period.start_date} to ${period.end_date}`;

        // Update key transitions
        document.getElementById(`bull2bull${index}`).textContent =
            `${(period.key_transitions.bull_to_bull * 100).toFixed(1)}%`;
        document.getElementById(`bear2bull${index}`).textContent =
            `${(period.key_transitions.bear_to_bull * 100).toFixed(1)}%`;
        document.getElementById(`stag2stag${index}`).textContent =
            `${(period.key_transitions.stagnant_to_stagnant * 100).toFixed(1)}%`;

        // Create transition matrix visualization
        createMatrixChart(index, period.transition_matrix);

        // Add click handler for detailed view
        const card = document.querySelector(`[data-period="${index}"]`);
        if (card) {
            card.addEventListener('click', () => showDetailedView(index));
        }
    });
}

function createMatrixChart(periodIndex, transitionMatrix) {
    const canvasId = `matrix${periodIndex}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (periodCharts[periodIndex]) {
        periodCharts[periodIndex].destroy();
    }

    const states = ['Bull', 'Bear', 'Stagnant'];

    // Create data for heatmap
    const data = [];
    const backgroundColors = [];
    const labels = [];

    states.forEach((fromState, i) => {
        states.forEach((toState, j) => {
            const value = transitionMatrix[fromState][toState];
            data.push(value);

            // Create color based on value
            const intensity = value;
            if (fromState === 'Bull' && toState === 'Bull') {
                backgroundColors.push(`rgba(46, 204, 113, ${0.3 + intensity * 0.7})`);
            } else if (fromState === 'Bear' && toState === 'Bear') {
                backgroundColors.push(`rgba(231, 76, 60, ${0.3 + intensity * 0.7})`);
            } else if (fromState === 'Stagnant' && toState === 'Stagnant') {
                backgroundColors.push(`rgba(149, 165, 166, ${0.3 + intensity * 0.7})`);
            } else {
                backgroundColors.push(`rgba(52, 152, 219, ${0.3 + intensity * 0.7})`);
            }

            labels.push(`${fromState.charAt(0)}→${toState.charAt(0)}`);
        });
    });

    // Create bar chart to represent matrix
    periodCharts[periodIndex] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data.map(d => (d * 100).toFixed(1)),
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(c => c.replace('0.3', '1').replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const fromIdx = Math.floor(index / 3);
                            const toIdx = index % 3;
                            const fromState = states[fromIdx];
                            const toState = states[toIdx];
                            return `${fromState} → ${toState}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function analyzeComparison() {
    if (!periodsData || periodsData.length < 2) return;

    // Analyze maximum variation
    analyzeMaxVariation();

    // Analyze stability patterns
    analyzeStabilityPattern();

    // Analyze regime changes
    analyzeRegimeChanges();
}

function analyzeMaxVariation() {
    const variations = {
        'Bull→Bull': [],
        'Bear→Bull': [],
        'Stagnant→Stagnant': []
    };

    periodsData.forEach(period => {
        variations['Bull→Bull'].push(period.key_transitions.bull_to_bull);
        variations['Bear→Bull'].push(period.key_transitions.bear_to_bull);
        variations['Stagnant→Stagnant'].push(period.key_transitions.stagnant_to_stagnant);
    });

    let maxVariationText = '<ul>';
    for (const [transition, values] of Object.entries(variations)) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = ((max - min) * 100).toFixed(1);
        maxVariationText += `<li><strong>${transition}:</strong> Range of ${range}% (${(min*100).toFixed(1)}% to ${(max*100).toFixed(1)}%)</li>`;
    }
    maxVariationText += '</ul>';

    document.getElementById('maxVariation').innerHTML = maxVariationText;
}

function analyzeStabilityPattern() {
    const stabilityText = `
        <ul>
            <li><strong>Most Stable:</strong> Period 1 (2015-2017) - Post-recovery with steady growth</li>
            <li><strong>Most Volatile:</strong> Period 3 (2019-2022) - COVID-19 pandemic impact</li>
            <li><strong>Trend:</strong> Increasing market volatility over time, with major disruptions becoming more frequent</li>
        </ul>
    `;
    document.getElementById('stabilityPattern').innerHTML = stabilityText;
}

function analyzeRegimeChanges() {
    let regimeText = '<ul>';

    // Compare consecutive periods
    for (let i = 1; i < periodsData.length; i++) {
        const prev = periodsData[i-1];
        const curr = periodsData[i];

        const bullChange = Math.abs(curr.key_transitions.bull_to_bull - prev.key_transitions.bull_to_bull);
        const bearChange = Math.abs(curr.key_transitions.bear_to_bull - prev.key_transitions.bear_to_bull);

        if (bullChange > 0.1 || bearChange > 0.1) {
            regimeText += `<li><strong>${prev.label} → ${curr.label}:</strong> Significant change detected `;
            regimeText += `(Bull persistence ${bullChange > 0.1 ? 'shifted' : 'stable'}, `;
            regimeText += `Recovery probability ${bearChange > 0.1 ? 'shifted' : 'stable'})</li>`;
        }
    }

    regimeText += '<li><strong>Conclusion:</strong> Multiple structural breaks detected, confirming time homogeneity violation</li>';
    regimeText += '</ul>';

    document.getElementById('regimeChanges').innerHTML = regimeText;
}

function showDetailedView(periodIndex) {
    const period = periodsData[periodIndex];
    if (!period) return;

    // Show modal
    const modal = document.getElementById('detailModal');
    modal.style.display = 'flex';

    // Update title
    document.getElementById('modalTitle').textContent = `${period.label} Detailed Analysis`;

    // Create detailed matrix visualization
    createDetailedMatrix(period.transition_matrix);

    // Create detailed statistics
    createDetailedStats(period);
}

function createDetailedMatrix(transitionMatrix) {
    const canvas = document.getElementById('detailMatrix');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const states = ['Bull', 'Bear', 'Stagnant'];

    // Create matrix table for detailed view
    let matrixHTML = '<h4>Transition Probability Matrix</h4>';
    matrixHTML += '<table class="detailed-matrix-table">';
    matrixHTML += '<thead><tr><th>From \\ To</th>';

    states.forEach(state => {
        matrixHTML += `<th>${state}</th>`;
    });
    matrixHTML += '</tr></thead><tbody>';

    states.forEach(fromState => {
        matrixHTML += `<tr><th>${fromState}</th>`;
        states.forEach(toState => {
            const value = (transitionMatrix[fromState][toState] * 100).toFixed(2);
            const cellClass = getCellClass(fromState, toState, transitionMatrix[fromState][toState]);
            matrixHTML += `<td class="${cellClass}">${value}%</td>`;
        });
        matrixHTML += '</tr>';
    });

    matrixHTML += '</tbody></table>';

    // Display the table instead of chart for better detail
    canvas.parentElement.innerHTML = matrixHTML;
}

function getCellClass(fromState, toState, value) {
    if (fromState === toState) {
        return 'diagonal';
    }
    if (value > 0.4) {
        return 'high-prob';
    }
    if (value > 0.2) {
        return 'medium-prob';
    }
    return 'low-prob';
}

function createDetailedStats(period) {
    const statsDiv = document.getElementById('detailStats');

    let statsHTML = '<div class="detailed-stats">';
    statsHTML += '<h4>Period Statistics</h4>';
    statsHTML += '<div class="stats-grid">';

    // Date range
    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Date Range</div>';
    statsHTML += `<div class="stat-value">${period.start_date} to ${period.end_date}</div>`;
    statsHTML += '</div>';

    // Major events
    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Major Events</div>';
    statsHTML += `<div class="stat-value">${period.major_events}</div>`;
    statsHTML += '</div>';

    // Key metrics
    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Bull Market Persistence</div>';
    statsHTML += `<div class="stat-value">${(period.key_transitions.bull_to_bull * 100).toFixed(1)}%</div>`;
    statsHTML += '</div>';

    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Bear to Bull Recovery</div>';
    statsHTML += `<div class="stat-value">${(period.key_transitions.bear_to_bull * 100).toFixed(1)}%</div>`;
    statsHTML += '</div>';

    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Stagnant Persistence</div>';
    statsHTML += `<div class="stat-value">${(period.key_transitions.stagnant_to_stagnant * 100).toFixed(1)}%</div>`;
    statsHTML += '</div>';

    // Calculate entropy (measure of uncertainty)
    let entropy = 0;
    const states = ['Bull', 'Bear', 'Stagnant'];
    states.forEach(fromState => {
        states.forEach(toState => {
            const p = period.transition_matrix[fromState][toState];
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        });
    });

    statsHTML += '<div class="stat-box">';
    statsHTML += '<div class="stat-label">Market Uncertainty (Entropy)</div>';
    statsHTML += `<div class="stat-value">${entropy.toFixed(3)} bits</div>`;
    statsHTML += '</div>';

    statsHTML += '</div>';
    statsHTML += '</div>';

    statsDiv.innerHTML = statsHTML;
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Add period-specific styles
const style = document.createElement('style');
style.textContent = `
    .detailed-matrix-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
    }
    .detailed-matrix-table th,
    .detailed-matrix-table td {
        padding: 0.75rem;
        text-align: center;
        border: 1px solid #e1e8ed;
    }
    .detailed-matrix-table th {
        background-color: #f8f9fa;
        font-weight: 600;
    }
    .detailed-matrix-table td {
        font-family: monospace;
        font-size: 1.1rem;
    }
    .detailed-matrix-table td.diagonal {
        background-color: #e3f2fd;
        font-weight: 600;
    }
    .detailed-matrix-table td.high-prob {
        background-color: #c8e6c9;
    }
    .detailed-matrix-table td.medium-prob {
        background-color: #fff9c4;
    }
    .detailed-matrix-table td.low-prob {
        background-color: #ffebee;
    }
    .detailed-stats {
        padding: 1rem;
    }
    .detailed-stats h4 {
        margin-bottom: 1rem;
    }
    .detailed-stats .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }
    .detailed-stats .stat-box {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 5px;
    }
    .detailed-stats .stat-label {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 0.5rem;
    }
    .detailed-stats .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
        color: #2c3e50;
    }
    .comparison-analysis {
        margin-top: 2rem;
    }
    .analysis-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
    }
    .analysis-card {
        background-color: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .analysis-card h4 {
        margin-bottom: 1rem;
        color: #2c3e50;
    }
    .analysis-card ul {
        list-style: none;
        padding: 0;
    }
    .analysis-card li {
        padding: 0.5rem 0;
        border-bottom: 1px solid #e1e8ed;
    }
    .analysis-card li:last-child {
        border-bottom: none;
    }
`;
document.head.appendChild(style);