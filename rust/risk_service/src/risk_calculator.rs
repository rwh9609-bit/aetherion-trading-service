use rand::rngs::StdRng;
use rand::SeedableRng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;

pub struct RiskCalculator {
    rng: StdRng,
    price_changes: Vec<f64>,
}

impl Default for RiskCalculator {
    fn default() -> Self {
        Self {
            rng: StdRng::from_entropy(),
            price_changes: Vec::new(),
        }
    }
}

impl RiskCalculator {
    pub fn calculate_var(&mut self, _positions: &HashMap<String, f64>, total_value: f64, confidence_level: f64) -> f64 {
        // Calculate historical volatility
        let volatility = if self.price_changes.is_empty() {
            0.02 // Default 2% daily volatility if no historical data
        } else {
            let mean = self.price_changes.iter().sum::<f64>() / self.price_changes.len() as f64;
            let variance = self.price_changes.iter()
                .map(|x| (x - mean).powi(2))
                .sum::<f64>() / (self.price_changes.len() - 1) as f64;
            variance.sqrt()
        };

        // Monte Carlo simulation parameters
        let num_simulations = 10_000;
        let time_horizon: f64 = 1.0; // 1 day

        // Create normal distribution for returns
        let normal = Normal::new(0.0, volatility * time_horizon.sqrt()).unwrap();

        // Run Monte Carlo simulation
        let mut portfolio_values = Vec::with_capacity(num_simulations);
        for _ in 0..num_simulations {
            let return_shock: f64 = normal.sample(&mut self.rng);
            let simulated_value = total_value * (1.0 + return_shock);
            portfolio_values.push(simulated_value);
        }

        // Sort portfolio values to find VaR
        portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
        let var = total_value - portfolio_values[var_index];

        var
    }

    #[cfg(test)]
    pub fn inject_sample_changes(&mut self, samples: &[f64]) {
        for &c in samples { self.add_price_change(c); }
    }

    pub fn add_price_change(&mut self, change: f64) {
        self.price_changes.push(change);
        if self.price_changes.len() > 252 { // Keep about 1 year of daily changes
            self.price_changes.remove(0);
        }
    }
}
