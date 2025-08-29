fn main() -> Result<(), Box<dyn std::error::Error>> {
    let proto_path = if std::path::Path::new("../../protos").exists() {
        "../../protos/trading_api.proto"
    } else {
        "protos/trading_api.proto"
    };
    let proto_dir = if std::path::Path::new("../../protos").exists() {
        "../../protos"
    } else {
        "protos"
    };

    tonic_build::configure()
        .compile(&[proto_path], &[proto_dir])?;
    Ok(())
}