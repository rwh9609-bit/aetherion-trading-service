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

        // Calculate VaR with 95% confidence level
        let var = {
            let mut calc = self.calculator.lock().map_err(|_| {
                Status::internal("Failed to acquire calculator lock")
            })?;
            
            // Add latest price change if available
            if let Some(price_change) = portfolio.last_price_change {
                calc.add_price_change(price_change);
            }
            
            calc.calculate_var(&positions, total_value, 0.95)
        };

        let response = VaRResponse {
            value_at_risk: var,
        };

        Ok(Response::new(response))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50052".parse()?;
    let risk_service = MyRiskService::default();

    println!("Rust RiskService listening on {}", addr);

    Server::builder()
        .add_service(RiskServiceServer::new(risk_service))
        .serve(addr)
        .await?;

    Ok(())
}