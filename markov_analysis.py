"""
Market Markov Analysis Class
Implementation of Markov chain analysis for S&P 500 market behavior
Author: Pranish Khanal
"""

import pandas as pd
import numpy as np
import yfinance as yf
from scipy import stats
from scipy.linalg import eig
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


class MarketMarkovAnalysis:
    """
    Analyzes market behavior using Markov chains.
    Tests for Markov property and time homogeneity in stock market data.
    """

    def __init__(self, ticker='^GSPC', start_date='2015-01-01', end_date='2024-10-19'):
        """
        Initialize the market analysis with default parameters.

        Parameters:
        -----------
        ticker : str
            Stock ticker symbol (default: S&P 500)
        start_date : str
            Start date for data collection
        end_date : str
            End date for data collection
        """
        self.ticker = ticker
        self.start_date = start_date
        self.end_date = end_date
        self.data = None
        self.transition_matrix = None
        self.stationary_dist = None
        self.state_counts = None
        self.chi_square_results = None

    def fetch_data(self):
        """
        Fetch stock data from Yahoo Finance.
        Calculate weekly returns.
        """
        try:
            # Download data with auto_adjust=True to get adjusted close prices
            stock_data = yf.download(self.ticker, start=self.start_date, end=self.end_date,
                                    progress=False, auto_adjust=True)

            if stock_data.empty:
                raise ValueError("No data retrieved for the specified ticker and date range")

            # Handle both single-level and multi-level column names
            if isinstance(stock_data.columns, pd.MultiIndex):
                # Multi-level columns - get Close price for the ticker
                if ('Close', self.ticker) in stock_data.columns:
                    close_price = stock_data[('Close', self.ticker)]
                else:
                    # Try to get the first column of Close prices
                    close_cols = [col for col in stock_data.columns if col[0] == 'Close']
                    if close_cols:
                        close_price = stock_data[close_cols[0]]
                    else:
                        raise ValueError("Could not find Close price column")
            else:
                # Single-level columns
                close_price = stock_data['Close'] if 'Close' in stock_data.columns else stock_data.iloc[:, 0]

            # Calculate weekly returns
            weekly_data = close_price.resample('W').last()
            weekly_returns = weekly_data.pct_change() * 100
            weekly_returns = weekly_returns.dropna()

            # Create DataFrame
            self.data = pd.DataFrame({
                'Date': weekly_returns.index,
                'Return': weekly_returns.values,
                'Price': weekly_data.iloc[1:].values
            })

            print(f"Data fetched successfully: {len(self.data)} weeks of data")
            return self.data

        except Exception as e:
            print(f"Error fetching data: {e}")
            import traceback
            traceback.print_exc()
            return None

    def classify_states(self, bull_threshold=1.5, bear_threshold=-1.5):
        """
        Classify market states based on weekly returns.

        Parameters:
        -----------
        bull_threshold : float
            Return threshold for bull market (default: 1.5%)
        bear_threshold : float
            Return threshold for bear market (default: -1.5%)
        """
        if self.data is None:
            raise ValueError("No data available. Please fetch data first.")

        conditions = [
            self.data['Return'] >= bull_threshold,
            self.data['Return'] <= bear_threshold,
            (self.data['Return'] > bear_threshold) & (self.data['Return'] < bull_threshold)
        ]
        choices = ['Bull', 'Bear', 'Stagnant']

        self.data['State'] = np.select(conditions, choices)

        # Calculate state counts
        self.state_counts = self.data['State'].value_counts()

        return self.data

    def estimate_transition_matrix(self):
        """
        Estimate the transition probability matrix from state sequences.
        """
        if 'State' not in self.data.columns:
            raise ValueError("States not classified. Please run classify_states first.")

        states = ['Bull', 'Bear', 'Stagnant']
        n_states = len(states)

        # Initialize transition count matrix
        transition_counts = pd.DataFrame(
            np.zeros((n_states, n_states)),
            index=states,
            columns=states
        )

        # Count transitions
        for i in range(len(self.data) - 1):
            current_state = self.data.iloc[i]['State']
            next_state = self.data.iloc[i + 1]['State']
            transition_counts.loc[current_state, next_state] += 1

        # Convert to probabilities
        self.transition_matrix = transition_counts.div(
            transition_counts.sum(axis=1),
            axis=0
        ).fillna(0)

        return self.transition_matrix

    def calculate_stationary_distribution(self):
        """
        Calculate the stationary distribution of the Markov chain.
        """
        if self.transition_matrix is None:
            raise ValueError("Transition matrix not calculated. Please run estimate_transition_matrix first.")

        # Get eigenvalues and eigenvectors
        eigenvalues, eigenvectors = eig(self.transition_matrix.T)

        # Find the eigenvector corresponding to eigenvalue 1
        stationary_index = np.argmax(np.abs(eigenvalues - 1.0) < 1e-8)
        stationary_eigenvector = np.real(eigenvectors[:, stationary_index])

        # Normalize to get probabilities
        stationary_distribution = stationary_eigenvector / stationary_eigenvector.sum()

        self.stationary_dist = pd.Series(
            stationary_distribution,
            index=self.transition_matrix.index
        )

        return self.stationary_dist

    def test_markov_property(self, lag=1):
        """
        Test for Markov property using chi-square independence test.

        Parameters:
        -----------
        lag : int
            Number of lags to test (default: 1 for first-order Markov)
        """
        if 'State' not in self.data.columns:
            raise ValueError("States not classified. Please run classify_states first.")

        results = {}

        # Test independence of current state from states beyond lag
        for test_lag in range(2, min(5, len(self.data) // 10)):
            # Create contingency table for independence test
            current = self.data['State'].iloc[test_lag:].values
            past = self.data['State'].iloc[:-test_lag].values

            # Create contingency table
            contingency_table = pd.crosstab(current[:len(past)], past)

            # Perform chi-square test
            chi2, p_value, dof, expected = stats.chi2_contingency(contingency_table)

            results[f'Lag_{test_lag}'] = {
                'chi2': chi2,
                'p_value': p_value,
                'dof': dof,
                'markov_property_holds': p_value > 0.05
            }

        self.chi_square_results = results
        return results

    def test_time_homogeneity(self, n_periods=4):
        """
        Test for time homogeneity by comparing transition matrices across time periods.

        Parameters:
        -----------
        n_periods : int
            Number of periods to split the data into (default: 4)
        """
        if 'State' not in self.data.columns:
            raise ValueError("States not classified. Please run classify_states first.")

        period_length = len(self.data) // n_periods
        period_matrices = []
        period_dates = []

        for i in range(n_periods):
            start_idx = i * period_length
            end_idx = (i + 1) * period_length if i < n_periods - 1 else len(self.data)

            period_data = self.data.iloc[start_idx:end_idx]
            period_dates.append({
                'start': period_data.iloc[0]['Date'],
                'end': period_data.iloc[-1]['Date']
            })

            # Calculate transition matrix for this period
            states = ['Bull', 'Bear', 'Stagnant']
            transition_counts = pd.DataFrame(
                np.zeros((3, 3)),
                index=states,
                columns=states
            )

            for j in range(len(period_data) - 1):
                current = period_data.iloc[j]['State']
                next_state = period_data.iloc[j + 1]['State']
                transition_counts.loc[current, next_state] += 1

            period_matrix = transition_counts.div(
                transition_counts.sum(axis=1),
                axis=0
            ).fillna(0)
            period_matrices.append(period_matrix)

        return period_matrices, period_dates

    def predict_and_validate(self, test_size=0.2, random_seed=42):
        """
        Split data, predict using Markov model, and validate accuracy.

        Parameters:
        -----------
        test_size : float
            Proportion of data to use for testing
        random_seed : int
            Random seed for reproducibility
        """
        if self.transition_matrix is None:
            raise ValueError("Transition matrix not calculated. Please run estimate_transition_matrix first.")

        np.random.seed(random_seed)

        # Split data
        split_point = int(len(self.data) * (1 - test_size))
        train_data = self.data.iloc[:split_point]
        test_data = self.data.iloc[split_point:]

        # Re-estimate transition matrix on training data
        states = ['Bull', 'Bear', 'Stagnant']
        train_transitions = pd.DataFrame(np.zeros((3, 3)), index=states, columns=states)

        for i in range(len(train_data) - 1):
            current = train_data.iloc[i]['State']
            next_state = train_data.iloc[i + 1]['State']
            train_transitions.loc[current, next_state] += 1

        train_matrix = train_transitions.div(train_transitions.sum(axis=1), axis=0).fillna(0)

        # Make predictions on test data
        predictions = []
        actual = []

        for i in range(len(test_data) - 1):
            current_state = test_data.iloc[i]['State']
            actual_next = test_data.iloc[i + 1]['State']

            # Get transition probabilities
            probs = train_matrix.loc[current_state]

            # Predict most likely next state
            predicted_state = probs.idxmax()

            predictions.append(predicted_state)
            actual.append(actual_next)

        # Calculate accuracy
        accuracy = np.mean([p == a for p, a in zip(predictions, actual)])

        return predictions, accuracy

    def get_random_scenario(self, exclude_last_n=50):
        """
        Get a random historical scenario for the prediction game.

        Parameters:
        -----------
        exclude_last_n : int
            Exclude the last n weeks from scenarios (for recency)
        """
        if self.data is None or self.transition_matrix is None:
            raise ValueError("Data and transition matrix must be available.")

        # Select random week (excluding very recent data and the last week)
        max_idx = len(self.data) - exclude_last_n - 1
        random_idx = np.random.randint(0, max_idx)

        current_week = self.data.iloc[random_idx]
        next_week = self.data.iloc[random_idx + 1]

        # Get transition probabilities from current state
        current_state = current_week['State']
        transition_probs = self.transition_matrix.loc[current_state]

        # Model prediction (highest probability)
        model_prediction = transition_probs.idxmax()

        # Random prediction
        random_prediction = np.random.choice(['Bull', 'Bear', 'Stagnant'])

        scenario = {
            'id': random_idx,
            'date': current_week['Date'].strftime('%Y-%m-%d'),
            'current_state': current_state,
            'current_return': round(current_week['Return'], 2),
            'transition_probabilities': {
                'Bull': round(transition_probs['Bull'], 3),
                'Bear': round(transition_probs['Bear'], 3),
                'Stagnant': round(transition_probs['Stagnant'], 3)
            },
            'actual_next_state': next_week['State'],
            'actual_next_return': round(next_week['Return'], 2),
            'model_prediction': model_prediction,
            'random_prediction': random_prediction
        }

        return scenario

    def analyze_with_thresholds(self, bull_threshold, bear_threshold):
        """
        Re-analyze data with custom thresholds.

        Parameters:
        -----------
        bull_threshold : float
            Custom bull market threshold
        bear_threshold : float
            Custom bear market threshold
        """
        # Re-classify states
        self.classify_states(bull_threshold, bear_threshold)

        # Re-estimate transition matrix
        self.estimate_transition_matrix()

        # Calculate stationary distribution
        self.calculate_stationary_distribution()

        # Test Markov property
        self.test_markov_property()

        # Test prediction accuracy
        _, accuracy = self.predict_and_validate()

        # Convert chi-square results to JSON-serializable format
        chi_square_json = {}
        if self.chi_square_results:
            for lag, result in self.chi_square_results.items():
                chi_square_json[lag] = {
                    'chi2': float(result['chi2']),
                    'p_value': float(result['p_value']),
                    'dof': int(result['dof']),
                    'markov_property_holds': bool(result['markov_property_holds'])
                }

        # Prepare results
        results = {
            'transition_matrix': self.transition_matrix.to_dict(),
            'state_distribution': self.state_counts.to_dict(),
            'stationary_dist': self.stationary_dist.to_dict(),
            'chi_square_results': chi_square_json,
            'prediction_accuracy': round(accuracy * 100, 1)
        }

        return results