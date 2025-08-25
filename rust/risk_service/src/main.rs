// This is a conceptual example of a Rust gRPC server using the tonic crate.
// It would be built as a separate microservice.

use tonic::{transport::Server, Request, Response, Status};
use chrono;
use trading_api::risk_service_server::RiskServiceServer;
use trading_api::{VaRRequest, VaRResponse};

// Import generated protobuf code
pub mod trading_api {
    tonic::include_proto!("trading");
}

mod risk_calculator;
use risk_calculator::RiskCalculator;
use std::sync::Mutex;

/// gRPC RiskService implementation using a thread-safe RiskCalculator
pub struct MyRiskService {
    calculator: Mutex<RiskCalculator>,
}

impl Default for MyRiskService {
    fn default() -> Self {
        Self {
            calculator: Mutex::new(RiskCalculator::default()),
        }
    }
}

#[tonic::async_trait]
impl trading_api::risk_service_server::RiskService for MyRiskService {
    async fn calculate_va_r(
        &self,
        request: Request<VaRRequest>,
    ) -> Result<Response<VaRResponse>, Status> {
        let req = request.into_inner();
        let portfolio = req.current_portfolio.ok_or_else(|| {
            Status::invalid_argument("Portfolio is required")
        })?;

        // Convert positions to HashMap
        let positions = portfolio.positions.clone();
        let total_value = portfolio.total_value_usd;

    // Use provided confidence level & horizon (defaults if zero)
    let confidence = if req.confidence_level > 0.0 { req.confidence_level } else { 0.95 };
    let _horizon = if req.horizon_days > 0.0 { req.horizon_days } else { 1.0 }; // Placeholder for scaling
        let mut calc = self.calculator.lock().map_err(|_| {
            Status::internal("Failed to acquire calculator lock")
        })?;

        // Add latest price change if available
        if let Some(price_change) = portfolio.last_price_change {
            let _ = price_change;
        }

        // --- Begin extended metrics logic ---
        let assets: Vec<String> = positions.keys().cloned().collect();
        let n = assets.len();
        let min_len = assets.iter().map(|a| calc.asset_returns.get(a).map(|v| v.len()).unwrap_or(0)).min().unwrap_or(0);
        let mut returns_matrix = nalgebra::DMatrix::zeros(min_len, n);
        for (j, asset) in assets.iter().enumerate() {
            if let Some(rets) = calc.asset_returns.get(asset) {
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
        let last_update = chrono::Utc::now().to_rfc3339();
        let var = calc.calculate_var(&positions, total_value, confidence);
        let response = VaRResponse {
            value_at_risk: var,
            asset_names: assets,
            correlation_matrix,
            volatility_per_asset,
            simulation_mode: simulation_mode.to_string(),
            last_update,
        };
        Ok(Response::new(response))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_var_respects_confidence_level() {
        let service = MyRiskService::default();
        {
            let mut calc = service.calculator.lock().unwrap();
            // Use inject_asset_history for test data injection if needed
            calc.inject_asset_history("BTC-USD", &[100.0, 101.0, 99.5, 101.5, 102.7, 101.2]);
        }
        let mut positions = HashMap::new();
        positions.insert("BTC-USD".to_string(), 1.0);
        let portfolio = trading_api::Portfolio { positions, total_value_usd: 10_000.0, last_price_change: None };
        let req_low = VaRRequest { current_portfolio: Some(portfolio.clone()), risk_model: "monte_carlo".to_string(), confidence_level: 0.90, horizon_days: 1.0 };
        let req_high = VaRRequest { current_portfolio: Some(portfolio), risk_model: "monte_carlo".to_string(), confidence_level: 0.99, horizon_days: 1.0 };
        let resp_low = service.calculate_va_r(tonic::Request::new(req_low)).await.unwrap().into_inner();
        let resp_high = service.calculate_va_r(tonic::Request::new(req_high)).await.unwrap().into_inner();
        assert!(resp_high.value_at_risk >= resp_low.value_at_risk, "higher confidence should not reduce VaR");
    }
}