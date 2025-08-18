use std::collections::HashMap;
use risk_service::risk_calculator::RiskCalculator;

#[test]
fn test_var_with_realistic_data_and_correlation() {
    let mut rc = RiskCalculator::default();
    // Simulate two assets with correlated returns
    // Asset A: Uptrend, Asset B: Downtrend, but correlated
    let asset_a_prices: Vec<f64> = (0..100).map(|i| 100.0 + i as f64 * 0.2 + (i as f64).sin()).collect();
    let asset_b_prices: Vec<f64> = (0..100).map(|i| 50.0 + i as f64 * 0.1 + (i as f64).sin() * 0.5).collect();
    rc.add_asset_history("A", &asset_a_prices);
    rc.add_asset_history("B", &asset_b_prices);
    let mut positions = HashMap::new();
    positions.insert("A".to_string(), 10000.0);
    positions.insert("B".to_string(), 5000.0);
    let total_value = 15000.0;
    let confidence = 0.99;
    let var = rc.calculate_var(&positions, total_value, confidence);
    // VaR should be positive and less than total_value
    assert!(var > 0.0 && var < total_value, "VaR not in expected range: {}", var);
}

#[test]
fn test_var_fallback_to_static_volatility() {
    let mut rc = RiskCalculator::default();
    let mut positions = HashMap::new();
    positions.insert("A".to_string(), 10000.0);
    let total_value = 10000.0;
    let confidence = 0.95;
    // No historical data, should fallback
    let var = rc.calculate_var(&positions, total_value, confidence);
    assert!(var > 0.0 && var < total_value, "Fallback VaR not in expected range: {}", var);
}

#[test]
fn test_var_with_single_asset() {
    let mut rc = RiskCalculator::default();
    let asset_prices: Vec<f64> = (0..252).map(|i| 100.0 + (i as f64).sin()).collect();
    rc.add_asset_history("A", &asset_prices);
    let mut positions = HashMap::new();
    positions.insert("A".to_string(), 10000.0);
    let total_value = 10000.0;
    let confidence = 0.99;
    let var = rc.calculate_var(&positions, total_value, confidence);
    assert!(var > 0.0 && var < total_value, "Single asset VaR not in expected range: {}", var);
}
