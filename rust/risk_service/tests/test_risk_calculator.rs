use std::collections::HashMap;
use risk_service::risk_calculator::RiskCalculator;
use rand::rngs::StdRng;
use rand::SeedableRng;

#[test]
fn test_var_with_realistic_data_and_correlation() {
    let mut rng = StdRng::from_seed([0; 32]);
    let mut asset_returns = HashMap::new();
    let asset_a_returns: Vec<f64> = (0..100).map(|i| 0.002 + (i as f64).sin() * 0.01).collect();
    let asset_b_returns: Vec<f64> = (0..100).map(|i| 0.001 + (i as f64).sin() * 0.005).collect();
    asset_returns.insert("A".to_string(), asset_a_returns);
    asset_returns.insert("B".to_string(), asset_b_returns);

    let mut positions = HashMap::new();
    positions.insert("A".to_string(), 1.0);
    positions.insert("B".to_string(), 2.0);
    let total_value = 15000.0;
    let confidence = 0.99;

    let var = RiskCalculator::calculate_var(
        &mut rng,
        &asset_returns,
        &positions,
        total_value,
        confidence,
    );
    // VaR should be positive and less than total_value
    assert!(var > 0.0 && var < total_value, "VaR not in expected range: {}", var);
}