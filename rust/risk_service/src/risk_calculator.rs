
use rand::rngs::StdRng;
use rand::SeedableRng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;
use nalgebra::{DMatrix, DVector, Cholesky};


pub struct RiskCalculator {
    /// Random number generator for Monte Carlo simulation
    rng: StdRng,
    /// Historical daily returns for each asset
    pub asset_returns: HashMap<String, Vec<f64>>, // asset -> daily returns
}


impl Default for RiskCalculator {
    fn default() -> Self {
        Self {
            rng: StdRng::from_entropy(),
            asset_returns: HashMap::new(),
        }
    }
}


impl RiskCalculator {

    /// Calculate portfolio VaR using correlated Monte Carlo simulation
    pub fn calculate_var(&mut self, positions: &HashMap<String, f64>, total_value: f64, confidence_level: f64) -> f64 {
        let assets: Vec<String> = positions.keys().cloned().collect();
        let n = assets.len();
        if n == 0 { return 0.0; }

        // Build matrix of returns (rows: days, cols: assets)
        let min_len = assets.iter().map(|a| self.asset_returns.get(a).map(|v| v.len()).unwrap_or(0)).min().unwrap_or(0);
        if min_len < 2 {
            // Not enough data, fallback to static volatility
            let fallback_vol = 0.02;
            let normal = Normal::new(0.0, fallback_vol).unwrap();
            let num_simulations = 10_000;
            let mut portfolio_values = Vec::with_capacity(num_simulations);
            for _ in 0..num_simulations {
                let shock = normal.sample(&mut self.rng);
                let simulated_value = total_value * (1.0 + shock);
                portfolio_values.push(simulated_value);
            }
            portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
            let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
            return total_value - portfolio_values[var_index];
        }

        // Build returns matrix
        let mut returns_matrix = DMatrix::zeros(min_len, n);
        for (j, asset) in assets.iter().enumerate() {
            let rets = &self.asset_returns[asset];
            for i in 0..min_len {
                returns_matrix[(i, j)] = rets[i];
            }
        }

        // Compute mean vector
        let mean_vec = returns_matrix.column_iter().map(|col| col.mean()).collect::<Vec<_>>();
        // Compute covariance matrix manually
        let n = returns_matrix.ncols();
        let m = returns_matrix.nrows();
        let mut cov_matrix = DMatrix::zeros(n, n);
        for i in 0..n {
            for j in 0..n {
                let mut sum = 0.0;
                for k in 0..m {
                    sum += (returns_matrix[(k, i)] - mean_vec[i]) * (returns_matrix[(k, j)] - mean_vec[j]);
                }
                cov_matrix[(i, j)] = sum / (m as f64 - 1.0);
            }
        }

        // Cholesky decomposition for correlated shocks
        let num_simulations = 10_000;
        let mut portfolio_values = Vec::with_capacity(num_simulations);
        let weights: Vec<f64> = assets.iter().map(|a| positions[a] / total_value).collect();
        if let Some(chol) = Cholesky::new(cov_matrix.clone()) {
            for _ in 0..num_simulations {
                // Generate independent standard normals
                let z: DVector<f64> = DVector::from_iterator(n, (0..n).map(|_| Normal::new(0.0, 1.0).unwrap().sample(&mut self.rng)));
                // Correlated returns
                let correlated = &chol.l() * z + DVector::from_vec(mean_vec.clone());
                // Portfolio return
                let port_ret = correlated.iter().zip(weights.iter()).map(|(r, w)| r * w).sum::<f64>();
                let simulated_value = total_value * (1.0 + port_ret);
                portfolio_values.push(simulated_value);
            }
        } else {
            // Fallback: use only diagonal variance (uncorrelated)
            for _ in 0..num_simulations {
                let mut port_ret = 0.0;
                for (j, w) in weights.iter().enumerate() {
                    let var = cov_matrix[(j, j)].abs();
                    let r = Normal::new(mean_vec[j], var.sqrt()).unwrap().sample(&mut self.rng);
                    port_ret += r * w;
                }
                let simulated_value = total_value * (1.0 + port_ret);
                portfolio_values.push(simulated_value);
            }
        }
        portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
        total_value - portfolio_values[var_index]
    }

    #[cfg(test)]
    pub fn inject_asset_history(&mut self, asset: &str, samples: &[f64]) {
        self.add_asset_history(asset, samples);
    }
}
