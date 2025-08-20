# Aetherion Trading Service

Aetherion is a next-generation, multi-language trading platform engineered for speed, flexibility, and reliability. Built on a cutting-edge microservices architecture, it harnesses the power of Docker for seamless containerization and orchestration—making deployment, scaling, and upgrades effortless.

### Key Features
- **Real-Time Market Data:** Instantly fetch live cryptocurrency prices (e.g., BTC from Coinbase) for lightning-fast trading decisions.
- **Polyglot Microservices:** Each service is crafted in the best language for the job—Rust for risk analytics, Go for trading logic, Python for orchestration, and more.
- **Service Mesh Magic:** Envoy powers secure, high-performance service-to-service communication.
- **Modern Frontend & Backend:** A sleek web interface for traders, backed by robust backend logic.
- **Intelligent Orchestration:** The orchestrator coordinates complex trading operations and strategies with ease.
- **Persistent Data:** All trades and analytics are safely stored in a PostgreSQL database.

### Architecture Overview
Aetherion is composed of specialized microservices, each with a unique mission:
- `multilanguage-backend`: The brains of the operation.
- `multilanguage-frontend`: The trader’s command center.
- `multilanguage-orchestrator`: The master coordinator for trading strategies.
- `multilanguage-trading`: Executes trades with precision.
- `multilanguage-risk`: Rust-powered risk management for peace of mind.
- `multilanguage-envoy`: The high-speed service mesh proxy.
- `multilanguage-postgres`: Reliable, scalable data storage.

### Getting Started

Spin up the entire system in seconds using the included Docker Compose setup.  
No manual configuration—just deploy and trade.

### Live Console Output

Check out the action! Below are snapshots of Aetherion in full swing—services running, live BTC price fetching, and real-time trading logs.

![Docker services running](container_success.png)

![Trading service logs](microservice_logging_success.png)

> **Pro Tip:** If you encounter SSL errors, comment out the `.pem` certs and use the alternate certs in `envoy.yaml`.
