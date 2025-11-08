"""
Interactive Markov Market Analysis Web Application
Flask backend for conference presentation
Author: Pranish Khanal
"""

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import pandas as pd
import numpy as np
from markov_analysis import MarketMarkovAnalysis
import json
import os
from datetime import datetime
import socket
import uuid

app = Flask(__name__)
app.secret_key = 'markov-analysis-2024-ramapo'
CORS(app)

# Initialize analysis with cached data
print("Initializing Market Analysis...")
analysis = MarketMarkovAnalysis(ticker='^GSPC', start_date='2015-01-01', end_date='2024-10-19')

# Cache for storing data and improving performance
cache = {
    'data_loaded': False,
    'period_matrices': None,
    'period_dates': None,
    'base_analysis': None,
    'game_sessions': {}
}


def initialize_data():
    """Initialize data on first run"""
    global cache
    if not cache['data_loaded']:
        print("Fetching market data...")
        analysis.fetch_data()
        analysis.classify_states()
        analysis.estimate_transition_matrix()
        analysis.calculate_stationary_distribution()
        analysis.test_markov_property()

        # Store period analysis
        cache['period_matrices'], cache['period_dates'] = analysis.test_time_homogeneity()
        cache['base_analysis'] = {
            'transition_matrix': analysis.transition_matrix.to_dict(),
            'state_distribution': analysis.state_counts.to_dict(),
            'stationary_dist': analysis.stationary_dist.to_dict()
        }
        cache['data_loaded'] = True
        print("Data initialization complete!")


def get_local_ip():
    """Get the local IP address for network sharing"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        return local_ip
    except:
        return 'localhost'


# Routes
@app.route('/')
def index():
    """Landing page"""
    local_ip = get_local_ip()
    return render_template('index.html', local_ip=local_ip)


@app.route('/explorer')
def explorer():
    """Parameter explorer page"""
    return render_template('explorer.html')


@app.route('/game')
def game():
    """Prediction game page"""
    # Initialize game session
    if 'game_id' not in session:
        session['game_id'] = str(uuid.uuid4())
        cache['game_sessions'][session['game_id']] = {
            'player_score': 0,
            'model_score': 0,
            'random_score': 0,
            'rounds_played': 0,
            'history': []
        }
    return render_template('game.html')


@app.route('/periods')
def periods():
    """Time period comparison page"""
    return render_template('periods.html')


@app.route('/admin')
def admin():
    """Admin panel for conference presenter"""
    # Check password
    auth = request.authorization
    if not auth or auth.password != 'markov2024':
        return 'Authentication required', 401, {'WWW-Authenticate': 'Basic realm="Admin"'}

    stats = {
        'active_sessions': len(cache['game_sessions']),
        'total_rounds': sum(s['rounds_played'] for s in cache['game_sessions'].values()),
        'avg_player_score': np.mean([s['player_score'] for s in cache['game_sessions'].values()]) if cache['game_sessions'] else 0,
        'avg_model_score': np.mean([s['model_score'] for s in cache['game_sessions'].values()]) if cache['game_sessions'] else 0
    }
    return render_template('admin.html', stats=stats)


# API Endpoints
@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyze with custom thresholds"""
    try:
        data = request.json
        bull_threshold = float(data.get('bull_threshold', 1.5))
        bear_threshold = float(data.get('bear_threshold', -1.5))

        # Validate thresholds
        if bull_threshold <= 0 or bull_threshold > 5:
            return jsonify({'error': 'Invalid bull threshold'}), 400
        if bear_threshold >= 0 or bear_threshold < -5:
            return jsonify({'error': 'Invalid bear threshold'}), 400

        # Create temporary analysis instance
        temp_analysis = MarketMarkovAnalysis()
        temp_analysis.data = analysis.data.copy()

        # Analyze with new thresholds
        results = temp_analysis.analyze_with_thresholds(bull_threshold, bear_threshold)

        return jsonify(results)

    except Exception as e:
        import traceback
        print(f"Error in /api/analyze: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/game/scenario')
def game_scenario():
    """Get a random game scenario"""
    try:
        scenario = analysis.get_random_scenario()
        return jsonify(scenario)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/game/predict', methods=['POST'])
def game_predict():
    """Process game prediction"""
    try:
        data = request.json
        scenario_id = int(data.get('scenario_id'))
        user_prediction = data.get('prediction')

        if 'game_id' not in session:
            return jsonify({'error': 'No game session'}), 400

        game_session = cache['game_sessions'].get(session['game_id'])
        if not game_session:
            return jsonify({'error': 'Invalid game session'}), 400

        # Get the actual scenario data
        current_week = analysis.data.iloc[scenario_id]
        next_week = analysis.data.iloc[scenario_id + 1]
        actual_state = next_week['State']

        # Get model prediction
        current_state = current_week['State']
        transition_probs = analysis.transition_matrix.loc[current_state]
        model_prediction = transition_probs.idxmax()

        # Random prediction
        random_prediction = np.random.choice(['Bull', 'Bear', 'Stagnant'])

        # Check correctness
        player_correct = (user_prediction == actual_state)
        model_correct = (model_prediction == actual_state)
        random_correct = (random_prediction == actual_state)

        # Update scores
        if player_correct:
            game_session['player_score'] += 10
        if model_correct:
            game_session['model_score'] += 10
        if random_correct:
            game_session['random_score'] += 10

        game_session['rounds_played'] += 1

        # Add to history
        game_session['history'].append({
            'round': game_session['rounds_played'],
            'player_prediction': user_prediction,
            'model_prediction': model_prediction,
            'actual': actual_state,
            'player_correct': player_correct
        })

        result = {
            'player_correct': player_correct,
            'model_correct': model_correct,
            'random_correct': random_correct,
            'actual_state': actual_state,
            'model_prediction': model_prediction,
            'random_prediction': random_prediction,
            'player_score': game_session['player_score'],
            'model_score': game_session['model_score'],
            'random_score': game_session['random_score'],
            'rounds_played': game_session['rounds_played'],
            'explanation': f"The market actually went {actual_state}. "
                          f"Model predicted {model_prediction} based on highest probability. "
                          f"This demonstrates the challenge of prediction even with known probabilities."
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/periods')
def periods_data():
    """Get period comparison data"""
    try:
        if not cache['period_matrices']:
            return jsonify({'error': 'Period data not available'}), 500

        periods_info = []
        period_labels = ['2015-2017', '2017-2019', '2019-2022', '2022-2024']
        major_events = [
            'Post-recovery period, steady growth',
            'Trade tensions, volatility increase',
            'COVID-19 pandemic, extreme volatility',
            'Inflation concerns, rate hikes'
        ]

        for i, (matrix, dates) in enumerate(zip(cache['period_matrices'], cache['period_dates'])):
            periods_info.append({
                'label': period_labels[i],
                'start_date': dates['start'].strftime('%Y-%m-%d'),
                'end_date': dates['end'].strftime('%Y-%m-%d'),
                'transition_matrix': matrix.to_dict(),
                'major_events': major_events[i],
                'key_transitions': {
                    'bull_to_bull': round(matrix.loc['Bull', 'Bull'], 3),
                    'bear_to_bull': round(matrix.loc['Bear', 'Bull'], 3),
                    'stagnant_to_stagnant': round(matrix.loc['Stagnant', 'Stagnant'], 3)
                }
            })

        return jsonify({'periods': periods_info})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/base_analysis')
def base_analysis():
    """Get base analysis results"""
    try:
        if not cache['base_analysis']:
            return jsonify({'error': 'Base analysis not available'}), 500

        return jsonify(cache['base_analysis'])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats')
def stats():
    """Get current statistics"""
    try:
        game_stats = {
            'total_sessions': len(cache['game_sessions']),
            'total_rounds': sum(s['rounds_played'] for s in cache['game_sessions'].values()),
            'active_players': len([s for s in cache['game_sessions'].values() if s['rounds_played'] > 0])
        }

        if cache['game_sessions']:
            scores = [(s['player_score'], s['model_score'], s['random_score'])
                     for s in cache['game_sessions'].values() if s['rounds_played'] > 0]
            if scores:
                player_scores, model_scores, random_scores = zip(*scores)
                game_stats['avg_player_score'] = round(np.mean(player_scores), 1)
                game_stats['avg_model_score'] = round(np.mean(model_scores), 1)
                game_stats['avg_random_score'] = round(np.mean(random_scores), 1)

        return jsonify(game_stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('404.html'), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return render_template('500.html'), 500


if __name__ == '__main__':
    # Initialize data on startup
    initialize_data()

    # Get local IP for display
    local_ip = get_local_ip()
    print(f"\n{'='*60}")
    print("INTERACTIVE MARKOV MARKET ANALYSIS")
    print(f"{'='*60}")
    print(f"Local Access: http://localhost:5001")
    print(f"Network Access: http://{local_ip}:5001")
    print(f"Admin Panel: http://localhost:5001/admin (password: markov2024)")
    print(f"{'='*60}\n")

    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5001)