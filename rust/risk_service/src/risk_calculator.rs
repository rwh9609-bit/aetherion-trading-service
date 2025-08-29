use rand::rngs::StdRng;
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;
use nalgebra::{DMatrix, DVector, Cholesky};
// use std::env;
// use std::fs::File;
// use std::io::{BufRead, BufReader};
// use std::path::Path;
use tracing::{info, debug, warn};

// Helper function to select Docker or local CSV path
// pub fn get_csv_path() -> String {
//     if let Ok(path) = env::var("CSV_PATH") {
//         return path;
//     }
//     let docker_path = "/app/data/btcusd_1-min_data.csv";
//     let local_path = "data/btcusd_1-min_data.csv";
//     if Path::new(docker_path).exists() {
//         docker_path.to_string()
//     } else {
//         local_path.to_string()
//     }
// }

// pub fn load_log_returns_from_csv(path: &str, asset_name: &str) -> Result<HashMap<String, Vec<f64>>, std::io::Error> {
//     let file = File::open(path)?;
//     let reader = BufReader::new(file);
//     let mut returns = Vec::new();

//     for line in reader.lines().skip(1) { // skip header
//         let line = line?;
//         let parts: Vec<&str> = line.split(',').collect();
//         if parts.len() == 2 {
//             if let Ok(ret) = parts[1].parse::<f64>() {
//                 returns.push(ret);
//             }
//         }
//     }

//     let mut map = HashMap::new();
//     map.insert(asset_name.to_string(), returns);

//     Ok(map)
// }

pub struct RiskCalculator {
    // No state needed here anymore
}


impl Default for RiskCalculator {
    fn default() -> Self {
        Self {}
    }
}


impl RiskCalculator {

    /// Calculate portfolio VaR using historical simulation
    pub fn calculate_var_historical(
        asset_returns: &HashMap<String, Vec<f64>>,
        positions: &HashMap<String, f64>,
        total_value: f64,
        confidence_level: f64,
    ) -> f64 {
        let assets: Vec<String> = positions.keys().cloned().collect();
        let n = assets.len();
        if n == 0 {
            return 0.0;
        }

        let min_len = assets.iter().map(|a| asset_returns.get(a).map(|v| v.len()).unwrap_or(0)).min().unwrap_or(0);
        if min_len == 0 {
            return 0.0;
        }

        let mut portfolio_returns = vec![0.0; min_len];
        for i in 0..min_len {
            for asset in &assets {
                let asset_return = asset_returns.get(asset).unwrap()[i];
                let position = positions.get(asset).unwrap();
                portfolio_returns[i] += asset_return * position;
            }
        }

        portfolio_returns.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let var_index = ((1.0 - confidence_level) * min_len as f64) as usize;
        total_value * portfolio_returns[var_index] * -1.0
    }

    /// Calculate portfolio VaR using correlated Monte Carlo simulation
    pub fn calculate_var(
        rng: &mut StdRng,
        asset_returns: &HashMap<String, Vec<f64>>,
        positions: &HashMap<String, f64>,
        total_value: f64,
        confidence_level: f64,
    ) -> f64 {
        let timer = std::time::Instant::now(); // Start timing

        let assets: Vec<String> = positions.keys().cloned().collect();
        let n = assets.len();

        info!("RiskCalculator: Starting VaR calculation for {} assets, total_value={:.2}, confidence_level={:.2}", n, total_value, confidence_level);

        if n == 0 {
            warn!("RiskCalculator: No assets in portfolio, returning VaR=0");
            return 0.0;
        }

        // Build matrix of returns (rows: days, cols: assets)
        let min_len = assets.iter().map(|a| asset_returns.get(a).map(|v| v.len()).unwrap_or(0)).min().unwrap_or(0);
        debug!("RiskCalculator: Minimum return history length across assets: {}", min_len);
        
        if min_len < 2 {
            warn!("RiskCalculator: Not enough data for simulation, using fallback volatility");
            // Not enough data, fallback to static volatility
            let fallback_vol = 0.02;
            let normal = Normal::new(0.0, fallback_vol).unwrap_or_else(|_| {
                warn!("Failed to create normal distribution, using default.");
                Normal::new(0.0, 0.01).unwrap()
            });
            let num_simulations = 10_000;
            let mut portfolio_values = Vec::with_capacity(num_simulations);
            for _ in 0..num_simulations {
                let shock = normal.sample(rng);
                let simulated_value = total_value * (1.0 + shock);
                portfolio_values.push(simulated_value);
            }
            portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
            let elapsed = timer.elapsed();
            info!("RiskCalculator: Fallback VaR calculation latency: {:.3?}", elapsed);
            return total_value - portfolio_values[var_index];
        }

        // Build returns matrix
        debug!("RiskCalculator: Building returns matrix ({} rows x {} cols)", min_len, n);
        let mut returns_matrix = DMatrix::zeros(min_len, n);
        for (j, asset) in assets.iter().enumerate() {
            let rets = &asset_returns[asset];
            for i in 0..min_len {
                returns_matrix[(i, j)] = rets[i];
            }
        }

        // Compute mean vector
        debug!("RiskCalculator: Computing mean vector");
        let mean_vec = returns_matrix.column_iter().map(|col| col.mean()).collect::<Vec<_>>();
        // Compute covariance matrix manually
        debug!("RiskCalculator: Computing covariance matrix");
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
        debug!("RiskCalculator: Running Monte Carlo simulation with {} iterations", num_simulations);
        let mut portfolio_values = Vec::with_capacity(num_simulations);
        let weights: Vec<f64> = assets.iter().map(|a| positions[a] / total_value).collect();
        if let Some(chol) = Cholesky::new(cov_matrix.clone()) {
            debug!("RiskCalculator: Cholesky decomposition succeeded, simulating correlated returns");
            for _ in 0..num_simulations {
                // Generate independent standard normals
                let z: DVector<f64> = DVector::from_iterator(n, (0..n).map(|_| Normal::new(0.0, 1.0).unwrap().sample(rng)));
                // Correlated returns
                let correlated = &chol.l() * z + DVector::from_vec(mean_vec.clone());
                // Portfolio return
                let port_ret = correlated.iter().zip(weights.iter()).map(|(r, w)| r * w).sum::<f64>();
                let simulated_value = total_value * (1.0 + port_ret);
                portfolio_values.push(simulated_value);
            }
        } else {
            // Fallback: use only diagonal variance (uncorrelated)
            warn!("RiskCalculator: Cholesky decomposition failed, simulating uncorrelated returns");
            for _ in 0..num_simulations {
                let mut port_ret = 0.0;
                for (j, w) in weights.iter().enumerate() {
                    let var = cov_matrix[(j, j)].abs();
                    let r = Normal::new(mean_vec[j], var.sqrt()).unwrap_or_else(|_| {
                        warn!("Failed to create normal distribution, using default.");
                        Normal::new(0.0, 0.01).unwrap()
                    }).sample(rng);
                    port_ret += r * w;
                }
                let simulated_value = total_value * (1.0 + port_ret);
                portfolio_values.push(simulated_value);
            }
        }
        portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
        let result = total_value - portfolio_values[var_index];

        let elapsed = timer.elapsed();
        info!("RiskCalculator: VaR calculation completed in {:.3?}, result={:.6}", elapsed, result);

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    #[test]
    fn test_load_log_returns_from_csv_success() {
        let mut file = tempfile::NamedTempFile::new().unwrap();
        writeln!(file, "date,return").unwrap();
        writeln!(file, "2023-01-01,0.1").unwrap();
        writeln!(file, "2023-01-02,-0.05").unwrap();
        let path = file.path().to_str().unwrap();

        let result = load_log_returns_from_csv(path, "TEST").unwrap();
        assert!(result.contains_key("TEST"));
        let returns = result.get("TEST").unwrap();
        assert_eq!(returns.len(), 2);
        assert_eq!(returns[0], 0.1);
        assert_eq!(returns[1], -0.05);
    }

    #[test]
    fn test_load_log_returns_from_csv_file_not_found() {
        let result = load_log_returns_from_csv("non_existent_file.csv", "TEST");
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_var_fallback() {
        let mut rng = StdRng::from_seed([0; 32]);
        let mut asset_returns = HashMap::new();
        asset_returns.insert("BTC-USD".to_string(), vec![0.1]);
        let mut positions = HashMap::new();
        positions.insert("BTC-USD".to_string(), 1.0);
        let total_value = 10000.0;
        let confidence_level = 0.95;

        let var = RiskCalculator::calculate_var(
            &mut rng,
            &asset_returns,
            &positions,
            total_value,
            confidence_level,
        );

        assert!(var > 0.0);
    }
}