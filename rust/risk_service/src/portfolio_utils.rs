use std::collections::HashMap;
use crate::trading_api::PortfolioResponse;

pub fn positions_map_from_portfolio(portfolio: &PortfolioResponse) -> HashMap<String, f64> {
    portfolio.positions
        .iter()
        .map(|pos| {
            let qty = pos.quantity.as_ref().map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0).unwrap_or(0.0);
            (pos.symbol.clone(), qty)
        })
        .collect()
}

pub fn total_value_from_portfolio(portfolio: &PortfolioResponse) -> f64 {
    portfolio.total_portfolio_value.as_ref()
        .map(|v| v.units as f64 + v.nanos as f64 / 1_000_000_000.0)
        .unwrap_or(0.0)
}
