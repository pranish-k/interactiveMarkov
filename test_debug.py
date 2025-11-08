#!/usr/bin/env python
"""Debug script to test the analyze endpoint"""

from markov_analysis import MarketMarkovAnalysis
import traceback

print("Testing analyze_with_thresholds...")

# Initialize
analysis = MarketMarkovAnalysis(ticker='^GSPC', start_date='2015-01-01', end_date='2024-10-19')
analysis.fetch_data()

print(f"Original data shape: {analysis.data.shape}")

# Create temp instance (simulating what Flask does)
temp_analysis = MarketMarkovAnalysis()
temp_analysis.data = analysis.data.copy()

print(f"Temp data shape: {temp_analysis.data.shape}")

# Try to analyze
try:
    results = temp_analysis.analyze_with_thresholds(2.0, -1.0)
    print("SUCCESS!")
    print(f"State distribution: {results['state_distribution']}")
except Exception as e:
    print(f"ERROR: {e}")
    traceback.print_exc()
