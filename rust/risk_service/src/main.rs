// This is a conceptual example of a Rust gRPC server using the tonic crate.
// It would be built as a separate microservice.

use tonic::{transport::Server, Request, Response, Status};
use chrono;
use trading_api::risk_service_server::RiskServiceServer;
use trading_api::{VaRRequest, VaRResponse};
use std::collections::HashMap;
use prost_types::Timestamp;
use rand::rngs::StdRng;
use rand::SeedableRng;
use tracing_subscriber;

// Import generated protobuf code
pub mod trading_api {
    tonic::include_proto!("trading");
}


mod risk_calculator;
use risk_calculator::{RiskCalculator, load_log_returns_from_csv, get_csv_path};

pub struct MyRiskService {
    pub historical_returns: HashMap<String, Vec<f64>>,
}

impl Default for MyRiskService {
    fn default() -> Self {
        // Load BTCUSD log returns from CSV at startup
        let returns = load_log_returns_from_csv(&get_csv_path(), "BTCUSD");
        Self { historical_returns: returns }
    }
}

#[tonic::async_trait]
impl trading_api::risk_service_server::RiskService for MyRiskService {
    async fn calculate_va_r(&self, request: Request<VaRRequest>,
    ) -> Result<Response<VaRResponse>, Status> {
        let req = request.into_inner();
        let portfolio = req.current_portfolio.ok_or_else(|| {
            Status::invalid_argument("Portfolio is required")
        })?;

        // Convert positions to HashMap<String, f64>
        let positions_map: HashMap<String, f64> = portfolio.positions
            .iter()
            .map(|pos| {
                let qty = pos.quantity.as_ref().map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0).unwrap_or(0.0);
                (pos.symbol.clone(), qty)
            })
            .collect();

        // Get total portfolio value as f64
        let total_value = portfolio.total_portfolio_value.as_ref()
            .map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0)
            .unwrap_or(0.0);

        // Use provided confidence level & horizon (defaults if zero)
        let confidence = if req.confidence_level > 0.0 { req.confidence_level } else { 0.95 };
        let _horizon = if req.horizon_days > 0.0 { req.horizon_days } else { 1.0 };

        // Initialize RNG for this request
        let mut rng = StdRng::from_entropy();

        let mut asset_returns: HashMap<String, Vec<f64>> = HashMap::new();
        if req.asset_histories.is_empty() {
            // Use loaded historical returns if available
            asset_returns = self.historical_returns.clone();
        } else {
            for (symbol, history) in req.asset_histories {
                asset_returns.insert(symbol, history.returns);
            }
        }
        if asset_returns.is_empty() {
            return Err(Status::failed_precondition("No asset return histories provided"));
        }

        // Call the stateless calculate_var function
        let var = RiskCalculator::calculate_var(
            &mut rng,
            &asset_returns,
            &positions_map,
            total_value,
            confidence,
        );

        // --- Begin extended metrics logic (still needs asset_returns and rng) ---
        let assets: Vec<String> = positions_map.keys().cloned().collect();
        let n = assets.len();
        let min_len = assets.iter().map(|a| asset_returns.get(a).map(|v| v.len()).unwrap_or(0)).min().unwrap_or(0);
        let mut returns_matrix = nalgebra::DMatrix::zeros(min_len, n);
        for (j, asset) in assets.iter().enumerate() {
            if let Some(rets) = asset_returns.get(asset) {
                for i in 0..min_len {
                    returns_matrix[(i, j)] = rets[i];
                }
            }
        }
        let mean_vec = returns_matrix.column_iter().map(|col| col.mean()).collect::<Vec<_>>();
        let ncols = returns_matrix.ncols();
        let nrows = returns_matrix.nrows();
        let mut cov_matrix = nalgebra::DMatrix::zeros(ncols, ncols);
        for i in 0..ncols {
            for j in 0..ncols {
                let mut sum = 0.0;
                for k in 0..nrows {
                    sum += (returns_matrix[(k, i)] - mean_vec[i]) * (returns_matrix[(k, j)] - mean_vec[j]);
                }
                cov_matrix[(i, j)] = if nrows > 1 { sum / (nrows as f64 - 1.0) } else { 0.0 };
            }
        }
        let simulation_mode = if nalgebra::Cholesky::new(cov_matrix.clone()).is_some() {
            "correlated"
        } else {
            "fallback"
        };
        let correlation_matrix: Vec<f64> = {
            let mut corr = Vec::with_capacity(ncols * ncols);
            for i in 0..ncols {
                for j in 0..ncols {
                    let cov = cov_matrix[(i, j)];
                    let std_i = (cov_matrix[(i, i)] as f64).abs().sqrt();
                    let std_j = (cov_matrix[(j, j)] as f64).abs().sqrt();
                    let corr_val = if std_i > 0.0 && std_j > 0.0 { cov / (std_i * std_j) } else { 0.0 };
                    corr.push(corr_val);
                }
            }
            corr
        };
        let volatility_per_asset: Vec<f64> = (0..ncols).map(|i| cov_matrix[(i, i)].abs().sqrt()).collect();
        let now = chrono::Utc::now();
        let last_update = Some(Timestamp {
            seconds: now.timestamp(),
            nanos: now.timestamp_subsec_nanos() as i32,
        });

        let var_decimal = trading_api::DecimalValue {
            units: var.trunc() as i64,
            nanos: ((var.fract()) * 1_000_000_000.0) as i32,
        };
        let response = VaRResponse {
            value_at_risk: Some(var_decimal),
            asset_names: assets,
            correlation_matrix,
            volatility_per_asset,
            simulation_mode: simulation_mode.to_string(),
            last_update,
        };
        Ok(Response::new(response))
    }
}

// --- MAIN ---

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    // Initialize tracing subscriber
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let addr = "0.0.0.0:50052".parse()?;
    let risk_service = MyRiskService::default();


    println!("Rust RiskService listening on {}", addr);
    // Flush stdout so Docker logs show the line immediately even if buffering occurs
    use std::io::{Write, stdout};
    let _ = stdout().flush();

    Server::builder()
        .add_service(RiskServiceServer::new(risk_service))
        .serve(addr)
        .await?;

    Ok(())
}

// --- TESTS ---
#[cfg(test)]
mod tests {
    use super::*;
    use trading_api::{PortfolioPosition, PortfolioResponse, DecimalValue};
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    #[tokio::test]
    async fn test_var_respects_confidence_level() {
        let service = MyRiskService::default();
        
        // Dummy asset returns for the test
        let mut asset_returns: HashMap<String, Vec<f64>> = HashMap::new();
        asset_returns.insert("BTC-USD".to_string(), vec![0.001, -0.002, 0.003, -0.001, 0.002, -0.003]);
        asset_returns.insert("ETH-USD".to_string(), vec![0.002, -0.001, 0.001, -0.002, 0.003, -0.001]);

        let positions = vec![
            PortfolioPosition {
                symbol: "BTC-USD".to_string(),
                quantity: Some(DecimalValue { units: 1, nanos: 0 }),
                average_price: None,
                market_value: None,
                unrealized_pnl: None,
                exposure_pct: None,
            },
            PortfolioPosition {
                symbol: "ETH-USD".to_string(),
                quantity: Some(DecimalValue { units: 0, nanos: 500_000_000 }), // 0.5 ETH
                average_price: None,
                market_value: None,
                unrealized_pnl: None,
                exposure_pct: None,
            }
        ];
        let portfolio = PortfolioResponse {
            bot_id: "test-bot".to_string(),
            positions,
            total_portfolio_value: Some(DecimalValue { units: 10_000, nanos: 0 }),
            cash_balance: None,
            updated_at: None,
        };

        // Use a fixed seed for reproducible tests
        let mut rng_low = StdRng::seed_from_u64(123);
        let mut rng_high = StdRng::seed_from_u64(123);

        let req_low = VaRRequest { current_portfolio: Some(portfolio.clone()), risk_model: "monte_carlo".to_string(), confidence_level: 0.90, horizon_days: 1.0 };
        let req_high = VaRRequest { current_portfolio: Some(portfolio), risk_model: "monte_carlo".to_string(), confidence_level: 0.99, horizon_days: 1.0 };
        
        // Manually call calculate_var for the test
        let var_low = RiskCalculator::calculate_var(&mut rng_low, &asset_returns, &positions_map_from_portfolio(&req_low.current_portfolio.as_ref().unwrap()), total_value_from_portfolio(&req_low.current_portfolio.as_ref().unwrap()), req_low.confidence_level);
        let var_high = RiskCalculator::calculate_var(&mut rng_high, &asset_returns, &positions_map_from_portfolio(&req_high.current_portfolio.as_ref().unwrap()), total_value_from_portfolio(&req_high.current_portfolio.as_ref().unwrap()), req_high.confidence_level);

        // Convert f64 VaR to DecimalValue for comparison
        let var_decimal_low = trading_api::DecimalValue {
            units: var_low.trunc() as i64,
            nanos: ((var_low.fract()) * 1_000_000_000.0) as i32,
        };
        let var_decimal_high = trading_api::DecimalValue {
            units: var_high.trunc() as i64,
            nanos: ((var_high.fract()) * 1_000_000_000.0) as i32,
        };

        assert!(var_decimal_high.units >= var_decimal_low.units, "higher confidence should not reduce VaR");
    }

    // Helper functions to extract data from PortfolioResponse for the test
    fn positions_map_from_portfolio(portfolio: &PortfolioResponse) -> HashMap<String, f64> {
        portfolio.positions
            .iter()
            .map(|pos| {
                let qty = pos.quantity.as_ref().map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0).unwrap_or(0.0);
                (pos.symbol.clone(), qty)
            })
            .collect()
    }

    fn total_value_from_portfolio(portfolio: &PortfolioResponse) -> f64 {
        portfolio.total_portfolio_value.as_ref()
            .map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0)
            .unwrap_or(0.0)
    }
}