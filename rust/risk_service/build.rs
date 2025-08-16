fn main() -> Result<(), Box<dyn std::error::Error>> {
    // In container the Dockerfile copies the root protos directory to ./protos
    // so we reference it relative to the crate root.
    tonic_build::configure()
        .compile(&["protos/trading_api.proto"], &["protos"])?;
    Ok(())
}