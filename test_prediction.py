#!/usr/bin/env python
"""Test script to investigate prediction accuracy"""

from markov_analysis import MarketMarkovAnalysis
import numpy as np

print("Testing prediction accuracy with different thresholds...\n")

# Initialize and fetch data
analysis = MarketMarkovAnalysis(ticker='^GSPC', start_date='2015-01-01', end_date='2024-10-19')
analysis.fetch_data()

# Test with default thresholds (2.0, -1.0)
print("=" * 60)
print("Test 1: Bull threshold = 2.0%, Bear threshold = -1.0%")
print("=" * 60)
analysis.classify_states(bull_threshold=2.0, bear_threshold=-1.0)
analysis.estimate_transition_matrix()

print("\nState Distribution:")
print(analysis.state_counts)

print("\nTransition Matrix:")
print(analysis.transition_matrix)

# Perform prediction
predictions, accuracy = analysis.predict_and_validate(test_size=0.2, random_seed=42)
print(f"\nPrediction Accuracy: {accuracy * 100:.1f}%")

# Test Markov property
chi_results = analysis.test_markov_property()
print("\nChi-Square Test Results:")
for lag, result in chi_results.items():
    print(f"  {lag}: p-value = {result['p_value']:.4f}, Holds = {result['markov_property_holds']}")

# Now test with original thresholds (1.5, -1.5)
print("\n" + "=" * 60)
print("Test 2: Bull threshold = 1.5%, Bear threshold = -1.5%")
print("=" * 60)
analysis.classify_states(bull_threshold=1.5, bear_threshold=-1.5)
analysis.estimate_transition_matrix()

print("\nState Distribution:")
print(analysis.state_counts)

print("\nTransition Matrix:")
print(analysis.transition_matrix)

predictions2, accuracy2 = analysis.predict_and_validate(test_size=0.2, random_seed=42)
print(f"\nPrediction Accuracy: {accuracy2 * 100:.1f}%")

chi_results2 = analysis.test_markov_property()
print("\nChi-Square Test Results:")
for lag, result in chi_results2.items():
    print(f"  {lag}: p-value = {result['p_value']:.4f}, Holds = {result['markov_property_holds']}")

# Calculate baseline (random guessing)
print("\n" + "=" * 60)
print("Baseline Analysis")
print("=" * 60)

# Get the actual test data state distribution
split_point = int(len(analysis.data) * 0.8)
test_data = analysis.data.iloc[split_point:]
test_state_counts = test_data['State'].value_counts()
total_test = len(test_data)

print(f"\nTest set state distribution:")
for state, count in test_state_counts.items():
    pct = (count / total_test) * 100
    print(f"  {state}: {count} ({pct:.1f}%)")

# Random guessing would get accuracy equal to sum of squared probabilities
random_accuracy = sum([(count/total_test)**2 for count in test_state_counts.to_dict().values()])
print(f"\nExpected accuracy from random guessing (matched to distribution): {random_accuracy * 100:.1f}%")

# Uniform random guessing
uniform_random = 1/3
print(f"Expected accuracy from uniform random guessing: {uniform_random * 100:.1f}%")

print("\n" + "=" * 60)
print("Conclusion")
print("=" * 60)
print(f"The model achieves {accuracy2 * 100:.1f}% accuracy vs {random_accuracy * 100:.1f}% baseline.")
print(f"This is a {(accuracy2 - random_accuracy) * 100:.1f}% improvement over chance.")
if accuracy2 - random_accuracy < 0.15:
    print("⚠️  This is LOW predictive power, demonstrating time homogeneity failure!")
else:
    print("✓ This shows significant predictive power.")
