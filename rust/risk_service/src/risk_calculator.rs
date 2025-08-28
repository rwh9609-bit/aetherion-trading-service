use rand::rngs::StdRng; 
use rand_distr::{Distribution, Normal};
use std::collections::HashMap;
use nalgebra::{DMatrix, DVector, Cholesky};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use tracing::{info, debug, warn, error};

// Helper function to select Docker or local CSV path
pub fn get_csv_path() -> String {
    let docker_path = "/app/data/BTCUSD_1min.csv";
    let local_path = "data/BTCUSD_1min.csv";
    if Path::new(docker_path).exists() {
        docker_path.to_string()
    } else {
        local_path.to_string()
    }
}

pub fn load_log_returns_from_csv(path: &str, asset_name: &str) -> HashMap<String, Vec<f64>> {
    let file = File::open(path).expect("CSV file not found");
    let reader = BufReader::new(file);
    let mut returns = Vec::new();

    for line in reader.lines().skip(1) { // skip header
        let line = line.unwrap();
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() == 2 {
            if let Ok(ret) = parts[1].parse::<f64>() {
                returns.push(ret);
            }
        }
    }

    let mut map = HashMap::new();
    map.insert(asset_name.to_string(), returns);

    map
}

pub struct RiskCalculator {
    // No state needed here anymore
}


impl Default for RiskCalculator {
    fn default() -> Self {
        Self {}
    }
}


impl RiskCalculator {

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
            let normal = Normal::new(0.0, fallback_vol).unwrap();
            let num_simulations = 10_000;
            let mut portfolio_values = Vec::with_capacity(num_simulations);
            for _ in 0..num_simulations {
                let shock = normal.sample(rng);
                let simulated_value = total_value * (1.0 + shock);
                portfolio_values.push(simulated_value);
            }
            portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
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
                    let r = Normal::new(mean_vec[j], var.sqrt()).unwrap().sample(rng);
                    port_ret += r * w;
                }
                let simulated_value = total_value * (1.0 + port_ret);
                portfolio_values.push(simulated_value);
            }
        }
        portfolio_values.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let var_index = ((1.0 - confidence_level) * num_simulations as f64) as usize;
        let result = total_value - portfolio_values[var_index];

        let elapsed = timer.elapsed();
        info!("RiskCalculator: VaR calculation completed in {:.3?}, result={:.6}", elapsed, result);

        result
    }
}