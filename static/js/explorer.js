// Parameter Explorer JavaScript

let stateChart = null;
let matrixChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeExplorer();
    loadBaseAnalysis();
});

function initializeExplorer() {
    // Setup slider listeners
    const bullSlider = document.getElementById('bullThreshold');
    const bearSlider = document.getElementById('bearThreshold');
    const bullValue = document.getElementById('bullValue');
    const bearValue = document.getElementById('bearValue');

    // Update display values and range visual
    bullSlider.addEventListener('input', function() {
        bullValue.textContent = this.value + '%';
        updateRangeDisplay();
    });

    bearSlider.addEventListener('input', function() {
        bearValue.textContent = this.value + '%';
        updateRangeDisplay();
    });

    // Update button listener
    document.getElementById('updateAnalysis').addEventListener('click', updateAnalysis);

    // Initialize range display
    updateRangeDisplay();
}

function updateRangeDisplay() {
    const bullThreshold = parseFloat(document.getElementById('bullThreshold').value);
    const bearThreshold = parseFloat(document.getElementById('bearThreshold').value);

    // Update range display text
    document.getElementById('bearRangeDisplay').textContent = `≤ ${bearThreshold}%`;
    document.getElementById('stagRangeDisplay').textContent = `${bearThreshold}% to ${bullThreshold}%`;
    document.getElementById('bullRangeDisplay').textContent = `≥ ${bullThreshold}%`;
}

async function loadBaseAnalysis() {
    try {
        showLoading('loadingIndicator');
        const data = await fetchAPI('/api/base_analysis');
        displayAnalysisResults(data);
        hideLoading('loadingIndicator');
    } catch (error) {
        console.error('Error loading base analysis:', error);
        hideLoading('loadingIndicator');
    }
}

async function updateAnalysis() {
    const bullThreshold = parseFloat(document.getElementById('bullThreshold').value);
    const bearThreshold = parseFloat(document.getElementById('bearThreshold').value);

    // Validate thresholds
    if (bullThreshold <= Math.abs(bearThreshold)) {
        showError('Bull threshold must be greater than the absolute value of bear threshold');
        return;
    }

    try {
        // Show loading state
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('updateAnalysis').disabled = true;

        // Fetch new analysis
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bull_threshold: bullThreshold,
                bear_threshold: bearThreshold
            })
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const data = await response.json();
        displayAnalysisResults(data);

        // Update insights
        updateInsights(data, bullThreshold, bearThreshold);

        showSuccess('Analysis updated successfully!');

    } catch (error) {
        showError('Failed to update analysis. Please try again.');
        console.error('Analysis error:', error);
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('updateAnalysis').disabled = false;
    }
}

function displayAnalysisResults(data) {
    // Display state distribution
    displayStateChart(data.state_distribution);

    // Display transition matrix
    displayTransitionMatrix(data.transition_matrix);

    // Display test results
    displayTestResults(data);

    // Display stationary distribution
    displayStationaryDistribution(data.stationary_dist);
}

function displayStateChart(stateDistribution) {
    const ctx = document.getElementById('stateChart').getContext('2d');

    // Destroy existing chart if it exists
    if (stateChart) {
        stateChart.destroy();
    }

    // Prepare data
    const states = ['Bull', 'Bear', 'Stagnant'];
    const counts = states.map(state => stateDistribution[state] || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    stateChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: states,
            datasets: [{
                data: counts,
                backgroundColor: [
                    '#2ecc71',  // Bull - green
                    '#e74c3c',  // Bear - red
                    '#95a5a6'   // Stagnant - gray
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return context.label + ': ' + context.raw + ' weeks (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    // Update stats text
    const statsText = document.getElementById('stateStats');
    if (statsText) {
        const percentages = counts.map((c, i) =>
            `${states[i]}: ${((c/total)*100).toFixed(1)}%`
        ).join(' | ');
        statsText.textContent = percentages;
    }
}

function displayTransitionMatrix(transitionMatrix) {
    const ctx = document.getElementById('matrixChart').getContext('2d');

    // Destroy existing chart if it exists
    if (matrixChart) {
        matrixChart.destroy();
    }

    // Create matrix visualization
    const states = ['Bull', 'Bear', 'Stagnant'];
    const matrixData = [];
    const backgroundColors = [];

    // Prepare data for visualization
    states.forEach((fromState, i) => {
        states.forEach((toState, j) => {
            const value = transitionMatrix[fromState][toState];
            matrixData.push({
                x: j,
                y: i,
                v: value
            });

            // Color based on probability value
            const intensity = Math.round(value * 255);
            backgroundColors.push(`rgba(52, 152, 219, ${value})`);
        });
    });

    // Create heatmap-style chart
    matrixChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Transition Probability',
                data: matrixData.map(d => ({
                    x: d.x,
                    y: d.y
                })),
                backgroundColor: backgroundColors,
                pointRadius: 30,
                pointHoverRadius: 35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    type: 'category',
                    labels: states,
                    title: {
                        display: true,
                        text: 'To State'
                    }
                },
                y: {
                    type: 'category',
                    labels: states,
                    title: {
                        display: true,
                        text: 'From State'
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
                            const fromState = states[context.parsed.y];
                            const toState = states[context.parsed.x];
                            const value = matrixData[context.dataIndex].v;
                            return `${fromState} → ${toState}: ${(value * 100).toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });

    // Display matrix as table
    displayMatrixTable(transitionMatrix);
}

function displayMatrixTable(matrix) {
    const matrixStats = document.getElementById('matrixStats');
    if (!matrixStats) return;

    const states = ['Bull', 'Bear', 'Stagnant'];
    let html = '<table class="matrix-table"><thead><tr><th>From \\ To</th>';

    states.forEach(state => {
        html += `<th>${state}</th>`;
    });
    html += '</tr></thead><tbody>';

    states.forEach(fromState => {
        html += `<tr><th>${fromState}</th>`;
        states.forEach(toState => {
            const value = (matrix[fromState][toState] * 100).toFixed(1);
            html += `<td>${value}%</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    matrixStats.innerHTML = html;
}

function displayTestResults(data) {
    // Display Markov property test results
    const markovResult = document.getElementById('markovResult');
    if (data.chi_square_results && data.chi_square_results.Lag_2) {
        const pValue = data.chi_square_results.Lag_2.p_value;
        const passes = pValue > 0.05;
        markovResult.innerHTML = `<span style="color: ${passes ? '#2ecc71' : '#e67e22'}">
            ${passes ? 'HOLDS' : 'REJECTED'} (p = ${pValue.toFixed(3)})
        </span>`;
    }

    // Display prediction accuracy
    const accuracyResult = document.getElementById('accuracyResult');
    if (data.prediction_accuracy !== undefined) {
        const accuracy = data.prediction_accuracy;
        const color = accuracy > 40 ? '#2ecc71' : accuracy > 30 ? '#f39c12' : '#e74c3c';
        accuracyResult.innerHTML = `<span style="color: ${color}">${accuracy}%</span>`;
    }
}

function displayStationaryDistribution(statDist) {
    const stationaryDiv = document.getElementById('stationaryDist');
    if (!stationaryDiv) return;

    let html = '<div class="stat-dist">';
    for (const [state, prob] of Object.entries(statDist)) {
        const percentage = (prob * 100).toFixed(1);
        html += `<span>${state}: ${percentage}%</span> `;
    }
    html += '</div>';
    stationaryDiv.innerHTML = html;
}

function updateInsights(data, bullThreshold, bearThreshold) {
    const insightsBox = document.getElementById('insights');

    let insights = '<div class="insights-content">';
    insights += '<div class="insight-item highlight">';
    insights += `<i class="fas fa-chart-line"></i>`;
    insights += `<div><strong>Threshold Configuration:</strong> Bull ≥ ${bullThreshold}%, Bear ≤ ${bearThreshold}%</div>`;
    insights += '</div>';

    // Markov property
    if (data.chi_square_results && data.chi_square_results.Lag_2) {
        const pValue = data.chi_square_results.Lag_2.p_value;
        const passes = pValue > 0.05;
        const icon = passes ? 'fa-check-circle' : 'fa-times-circle';
        const color = passes ? '#2ecc71' : '#e67e22';
        insights += `<div class="insight-item">`;
        insights += `<i class="fas ${icon}" style="color: ${color}"></i>`;
        insights += `<div><strong>Markov Property Test:</strong> `;
        if (passes) {
            insights += `Supports Markov property (p = ${pValue.toFixed(3)}) - States appear independent beyond lag-1, suggesting first-order Markov chain applies.`;
        } else {
            insights += `Rejects Markov property (p = ${pValue.toFixed(3)}) - Markets have memory beyond one step. Real markets are too complex for simple first-order Markov models.`;
        }
        insights += '</div>';
        insights += '</div>';
    }

    // Prediction accuracy
    if (data.prediction_accuracy !== undefined && data.state_distribution) {
        const accuracy = data.prediction_accuracy;
        const total = Object.values(data.state_distribution).reduce((a, b) => a + b, 0);
        const baseline = Object.values(data.state_distribution).reduce((sum, count) => {
            return sum + Math.pow(count / total, 2);
        }, 0) * 100;
        const improvement = accuracy - baseline;

        const icon = improvement > 20 ? 'fa-star' : improvement > 10 ? 'fa-chart-line' : 'fa-exclamation-triangle';
        const color = improvement > 20 ? '#2ecc71' : improvement > 10 ? '#3498db' : '#f39c12';
        insights += `<div class="insight-item">`;
        insights += `<i class="fas ${icon}" style="color: ${color}"></i>`;
        insights += `<div><strong>Prediction Accuracy:</strong> ${accuracy}% vs ${baseline.toFixed(1)}% baseline (random) - `;
        insights += `Only ${improvement.toFixed(1)}% improvement shows weak predictive power, `;
        insights += `demonstrating that markets change over time (time homogeneity failure).</div>`;
        insights += '</div>';
    }

    // State distribution
    if (data.state_distribution) {
        const total = Object.values(data.state_distribution).reduce((a, b) => a + b, 0);
        const bullPct = ((data.state_distribution.Bull / total) * 100).toFixed(1);
        const bearPct = ((data.state_distribution.Bear / total) * 100).toFixed(1);
        const stagPct = ((data.state_distribution.Stagnant / total) * 100).toFixed(1);
        insights += `<div class="insight-item">`;
        insights += `<i class="fas fa-pie-chart"></i>`;
        insights += `<div><strong>State Distribution:</strong> Bull ${bullPct}%, Bear ${bearPct}%, Stagnant ${stagPct}%</div>`;
        insights += '</div>';
    }

    insights += '<div class="insight-takeaway">';
    insights += '<i class="fas fa-graduation-cap"></i>';
    insights += '<div><strong>Key Takeaway:</strong> ';

    // Calculate improvement over random baseline
    if (data.state_distribution) {
        const total = Object.values(data.state_distribution).reduce((a, b) => a + b, 0);
        const baseline = Object.values(data.state_distribution).reduce((sum, count) => {
            return sum + Math.pow(count / total, 2);
        }, 0) * 100;
        const improvement = accuracy - baseline;

        insights += `The model's ${accuracy}% accuracy vs ${baseline.toFixed(1)}% baseline (random guessing) shows only ${improvement.toFixed(1)}% improvement. `;
    }

    insights += 'Markets exhibit some short-term patterns, but changing dynamics over time prevent reliable long-term predictions (time homogeneity failure).</div>';
    insights += '</div>';

    insights += '</div>';
    insightsBox.innerHTML = insights;
}

// Add CSS for insights (inline for quick styling)
const insightsStyle = document.createElement('style');
insightsStyle.textContent = `
    .insights-content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .insight-item {
        display: flex;
        align-items: start;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border-left: 3px solid var(--accent);
    }
    .insight-item.highlight {
        background: linear-gradient(135deg, #e3f2fd 0%, #f1f8ff 100%);
        border-left-color: var(--accent);
    }
    .insight-item i {
        font-size: 1.3rem;
        margin-top: 0.2rem;
        flex-shrink: 0;
    }
    .insight-item div {
        flex: 1;
        line-height: 1.6;
    }
    .insight-takeaway {
        background: linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%);
        border-left-color: #ffc107 !important;
        margin-top: 0.5rem;
    }
    .insight-takeaway i {
        color: #f39c12;
    }
`;
document.head.appendChild(insightsStyle);

// Add CSS for matrix table
const style = document.createElement('style');
style.textContent = `
    .matrix-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }
    .matrix-table th,
    .matrix-table td {
        padding: 0.5rem;
        text-align: center;
        border: 1px solid #e1e8ed;
    }
    .matrix-table th {
        background-color: #f8f9fa;
        font-weight: 600;
    }
    .matrix-table td {
        font-family: monospace;
    }
    .stat-dist {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .stat-dist span {
        background-color: #f8f9fa;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
    }
`;
document.head.appendChild(style);