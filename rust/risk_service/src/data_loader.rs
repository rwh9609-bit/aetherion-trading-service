use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::env;

pub fn get_csv_path() -> String {
    if let Ok(path) = env::var("CSV_PATH") {
        return path;
    }
    let docker_path = "/app/data/btcusd_1-min_data.csv";
    let local_path = "data/btcusd_1-min_data.csv";
    if Path::new(docker_path).exists() {
        docker_path.to_string()
    } else {
        local_path.to_string()
    }
}

pub fn load_log_returns_from_csv(path: &str, asset_name: &str) -> Result<HashMap<String, Vec<f64>>, std::io::Error> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut returns = Vec::new();

    for line in reader.lines().skip(1) { // skip header
        let line = line?;
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() == 2 {
            if let Ok(ret) = parts[1].parse::<f64>() {
                returns.push(ret);
            }
        }
    }

    let mut map = HashMap::new();
    map.insert(asset_name.to_string(), returns);

    Ok(map)
}
