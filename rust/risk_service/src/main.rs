// This is a conceptual example of a Rust gRPC server using the tonic crate.
// It would be built as a separate microservice.

use tonic::{transport::Server, Request, Response, Status};
use trading_api::risk_service_server::{RiskService, RiskServiceServer};
use trading_api::{VaRRequest, VaRResponse};

// Import generated protobuf code
pub mod trading_api {
    tonic::include_proto!("trading");
}

mod risk_calculator;
use risk_calculator::RiskCalculator;
use std::sync::Mutex;

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
impl RiskService for MyRiskService {
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
        let var = {
            let mut calc = self.calculator.lock().map_err(|_| {
                Status::internal("Failed to acquire calculator lock")
            })?;
            
            // Add latest price change if available
            if let Some(price_change) = portfolio.last_price_change {
                calc.add_price_change(price_change);
            }
            
            calc.calculate_var(&positions, total_value, confidence)
        };

        let response = VaRResponse { value_at_risk: var };

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
            calc.inject_sample_changes(&[0.01, -0.015, 0.02, -0.005, 0.012]);
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