fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .compile(&["../../protos/trading_api.proto"], &["../../protos"])?;
    Ok(())
}