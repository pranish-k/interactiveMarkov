// Market Prediction Game JavaScript

class GameManager {
    constructor() {
        this.playerScore = 0;
        this.modelScore = 0;
        this.randomScore = 0;
        this.currentRound = 0;
        this.maxRounds = 20;
        this.currentScenario = null;
        this.isProcessing = false;
        this.gameHistory = [];
    }

    async init() {
        await this.loadNewScenario();
        this.updateScoreboard();
    }

    async loadNewScenario() {
        if (this.currentRound >= this.maxRounds) {
            this.endGame();
            return;
        }

        try {
            this.disablePredictionButtons(true);
            this.hideResults();

            const response = await fetch('/api/game/scenario');
            if (!response.ok) throw new Error('Failed to load scenario');

            this.currentScenario = await response.json();
            this.currentRound++;
            this.displayScenario();
            this.disablePredictionButtons(false);

        } catch (error) {
            console.error('Error loading scenario:', error);
            showError('Failed to load scenario. Please refresh the page.');
        }
    }

    displayScenario() {
        // Update round number
        document.getElementById('roundNumber').textContent = `${this.currentRound} / ${this.maxRounds}`;

        // Display current state
        const currentStateDiv = document.getElementById('currentState');
        const currentReturnDiv = document.getElementById('currentReturn');
        const scenarioDateDiv = document.getElementById('scenarioDate');

        currentStateDiv.textContent = this.currentScenario.current_state;
        currentStateDiv.className = `state-name ${this.currentScenario.current_state.toLowerCase()}`;

        // Format return display
        const returnValue = this.currentScenario.current_return;
        const returnSign = returnValue >= 0 ? '+' : '';
        currentReturnDiv.textContent = `${returnSign}${returnValue}%`;
        currentReturnDiv.style.color = returnValue >= 0 ? '#2ecc71' : '#e74c3c';

        // Display date (hidden for game purposes, but shown for context)
        scenarioDateDiv.textContent = `Historical Week (Date Hidden)`;

        // Display transition probabilities
        this.displayProbabilities();

        // Update state icon
        this.updateStateIcon(this.currentScenario.current_state);
    }

    displayProbabilities() {
        const probs = this.currentScenario.transition_probabilities;

        // Bull probability
        const bullProb = probs.Bull * 100;
        document.getElementById('bullProb').style.width = `${bullProb}%`;
        document.getElementById('bullProbValue').textContent = `${bullProb.toFixed(1)}%`;

        // Bear probability
        const bearProb = probs.Bear * 100;
        document.getElementById('bearProb').style.width = `${bearProb}%`;
        document.getElementById('bearProbValue').textContent = `${bearProb.toFixed(1)}%`;

        // Stagnant probability
        const stagnantProb = probs.Stagnant * 100;
        document.getElementById('stagnantProb').style.width = `${stagnantProb}%`;
        document.getElementById('stagnantProbValue').textContent = `${stagnantProb.toFixed(1)}%`;
    }

    updateStateIcon(state) {
        const iconDiv = document.querySelector('.state-icon');
        let icon, color;

        switch(state) {
            case 'Bull':
                icon = 'fa-arrow-trend-up';
                color = '#2ecc71';
                break;
            case 'Bear':
                icon = 'fa-arrow-trend-down';
                color = '#e74c3c';
                break;
            case 'Stagnant':
                icon = 'fa-minus';
                color = '#95a5a6';
                break;
            default:
                icon = 'fa-chart-line';
                color = '#3498db';
        }

        iconDiv.innerHTML = `<i class="fas ${icon}" style="color: ${color}"></i>`;
    }

    async submitPrediction(prediction) {
        if (this.isProcessing || !this.currentScenario) return;

        this.isProcessing = true;
        this.disablePredictionButtons(true);

        try {
            const response = await fetch('/api/game/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scenario_id: this.currentScenario.id,
                    prediction: prediction
                })
            });

            if (!response.ok) throw new Error('Prediction failed');

            const result = await response.json();
            this.processResult(result, prediction);

        } catch (error) {
            console.error('Error submitting prediction:', error);
            showError('Failed to submit prediction. Please try again.');
            this.isProcessing = false;
            this.disablePredictionButtons(false);
        }
    }

    processResult(result, userPrediction) {
        // Update scores
        this.playerScore = result.player_score;
        this.modelScore = result.model_score;
        this.randomScore = result.random_score;

        // Update scoreboard
        this.updateScoreboard();

        // Display results
        this.displayResults(result, userPrediction);

        // Add to history
        this.gameHistory.push({
            round: this.currentRound,
            userPrediction: userPrediction,
            actual: result.actual_state,
            correct: result.player_correct
        });

        this.isProcessing = false;
    }

    displayResults(result, userPrediction) {
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.style.display = 'block';

        // Actual state
        const actualStateEl = document.getElementById('actualState');
        actualStateEl.textContent = result.actual_state;
        actualStateEl.className = `result-value ${result.actual_state.toLowerCase()}`;

        // User prediction
        const yourPredEl = document.getElementById('yourPrediction');
        yourPredEl.textContent = userPrediction;
        yourPredEl.className = result.player_correct ? 'result-value correct' : 'result-value incorrect';

        // Model prediction
        const modelPredEl = document.getElementById('modelPrediction');
        modelPredEl.textContent = result.model_prediction;
        modelPredEl.className = result.model_correct ? 'result-value correct' : 'result-value incorrect';

        // Random prediction
        const randomPredEl = document.getElementById('randomPrediction');
        randomPredEl.textContent = result.random_prediction;
        randomPredEl.className = result.random_correct ? 'result-value correct' : 'result-value incorrect';

        // Explanation
        document.getElementById('explanation').textContent = result.explanation;

        // Animate result display
        resultDisplay.style.animation = 'slideIn 0.5s ease';
    }

    hideResults() {
        document.getElementById('resultDisplay').style.display = 'none';
    }

    updateScoreboard() {
        // Animate score updates
        this.animateScore('playerScore', this.playerScore);
        this.animateScore('modelScore', this.modelScore);
        this.animateScore('randomScore', this.randomScore);
    }

    animateScore(elementId, newScore) {
        const element = document.getElementById(elementId);
        const currentScore = parseInt(element.textContent) || 0;

        if (currentScore !== newScore) {
            element.style.animation = 'pulse 0.5s ease';
            element.textContent = newScore;
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    disablePredictionButtons(disabled) {
        const buttons = document.querySelectorAll('.pred-btn');
        buttons.forEach(btn => {
            btn.disabled = disabled;
            if (disabled) {
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    endGame() {
        // Show game over modal
        const modal = document.getElementById('gameOverModal');
        modal.style.display = 'flex';

        // Display final scores
        document.getElementById('finalPlayerScore').textContent = this.playerScore;
        document.getElementById('finalModelScore').textContent = this.modelScore;
        document.getElementById('finalRandomScore').textContent = this.randomScore;

        // Generate conclusion
        let conclusion = '';
        if (this.playerScore > this.modelScore) {
            conclusion = "Congratulations! You beat the Markov model! This demonstrates that human intuition can sometimes outperform statistical models, especially when market dynamics are changing.";
        } else if (this.playerScore === this.modelScore) {
            conclusion = "You tied with the Markov model! This shows that even with perfect knowledge of transition probabilities, prediction remains challenging.";
        } else {
            conclusion = "The Markov model scored higher, but don't worry! This illustrates why markets are unpredictable - even statistical models struggle due to time-varying dynamics.";
        }

        // Add comparison to random
        if (this.randomScore >= Math.max(this.playerScore, this.modelScore)) {
            conclusion += " Interestingly, random guessing performed as well or better, highlighting the fundamental unpredictability of markets.";
        }

        document.getElementById('gameConclusion').textContent = conclusion;
    }

    reset() {
        this.playerScore = 0;
        this.modelScore = 0;
        this.randomScore = 0;
        this.currentRound = 0;
        this.currentScenario = null;
        this.gameHistory = [];
        this.isProcessing = false;

        // Hide modal
        document.getElementById('gameOverModal').style.display = 'none';

        // Reset display
        this.updateScoreboard();
        this.hideResults();

        // Start new game
        this.init();
    }
}

// Global game instance
let gameManager = null;

// Initialize game on page load
document.addEventListener('DOMContentLoaded', function() {
    gameManager = new GameManager();
    gameManager.init();
});

// Global functions for button clicks
function makePrediction(prediction) {
    if (gameManager) {
        gameManager.submitPrediction(prediction);
    }
}

function loadNewScenario() {
    if (gameManager) {
        gameManager.loadNewScenario();
    }
}

function resetGame() {
    if (gameManager) {
        gameManager.reset();
    }
}

// Add game-specific styles
const style = document.createElement('style');
style.textContent = `
    .state-name.bull {
        color: #2ecc71;
    }
    .state-name.bear {
        color: #e74c3c;
    }
    .state-name.stagnant {
        color: #95a5a6;
    }
    .result-value {
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
    }
    .result-value.correct {
        background-color: #d4edda;
        color: #155724;
    }
    .result-value.incorrect {
        background-color: #f8d7da;
        color: #721c24;
    }
    .result-value.bull {
        color: #2ecc71;
    }
    .result-value.bear {
        color: #e74c3c;
    }
    .result-value.stagnant {
        color: #95a5a6;
    }
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
    }
    .final-scores {
        margin: 2rem 0;
    }
    .score-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e1e8ed;
        font-size: 1.2rem;
    }
    .score-row span:last-child {
        font-weight: 600;
    }
    .game-conclusion {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 5px;
        margin: 1rem 0;
        line-height: 1.6;
    }
`;
document.head.appendChild(style);