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

    // Update display values
    bullSlider.addEventListener('input', function() {
        bullValue.textContent = this.value + '%';
    });

    bearSlider.addEventListener('input', function() {
        bearValue.textContent = this.value + '%';
    });

    // Update button listener
    document.getElementById('updateAnalysis').addEventListener('click', updateAnalysis);
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
        markovResult.innerHTML = `<span style="color: ${passes ? '#2ecc71' : '#e74c3c'}">
            ${passes ? 'PASSES' : 'FAILS'} (p = ${pValue.toFixed(3)})
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

    let insights = '<h4>Analysis Results:</h4><ul>';

    // Threshold insights
    insights += `<li>With bull threshold at ${bullThreshold}% and bear threshold at ${bearThreshold}%:</li>`;

    // Markov property
    if (data.chi_square_results && data.chi_square_results.Lag_2) {
        const passes = data.chi_square_results.Lag_2.p_value > 0.05;
        insights += `<li>The Markov property ${passes ? 'holds' : 'does not hold'},
                     indicating the market ${passes ? 'has' : 'lacks'} one-week memory.</li>`;
    }

    // Prediction accuracy
    if (data.prediction_accuracy !== undefined) {
        insights += `<li>Prediction accuracy is ${data.prediction_accuracy}%,
                     ${data.prediction_accuracy < 40 ? 'demonstrating poor predictive power despite valid statistical properties' :
                       'showing moderate predictive capability'}.</li>`;
    }

    // State distribution
    if (data.state_distribution) {
        const total = Object.values(data.state_distribution).reduce((a, b) => a + b, 0);
        const bullPct = ((data.state_distribution.Bull / total) * 100).toFixed(1);
        insights += `<li>Bull markets occur ${bullPct}% of the time with these thresholds.</li>`;
    }

    insights += '</ul>';
    insights += '<p><strong>Key Takeaway:</strong> Regardless of threshold settings, the model consistently shows that while markets exhibit short-term memory (Markov property), changing market dynamics over time prevent accurate predictions.</p>';

    insightsBox.innerHTML = insights;
}

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