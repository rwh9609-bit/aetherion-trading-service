# Aetherion Trading Engine

**A next-generation, cloud-native trading & automation platform for ambitious quants and builders.**

## What is Aetherion?

Aetherion is a modern quantitative trading platform that combines real-time market data, advanced risk management, and automated trading strategies in one powerful system. Whether you're a quantitative analyst, algorithmic trader, or fintech developer, Aetherion provides the tools you need to create, test, and deploy sophisticated trading strategies.

## 🌟 Key Features

### Advanced Risk Management (in progress)

- **Pluggable risk engine (Rust)** foundation prepared for Monte Carlo VaR & limit checks (initial scaffolding)
- **Real-time position tracking** (portfolio simulation) with future hooks for limits
- **JWT‑secured control plane** with optional auth bypass for local iteration

### Reliable Market Data

- **Coinbase WebSocket feed** with dynamic symbol subscription (defaults configurable via `DEFAULT_SYMBOLS` env var; default: BTC-USD, ETH-USD, SOL-USD, ILV-USD)
- **Event bus fanout** -> low-latency internal tick distribution (`StreamPrice`)
- **Server-side momentum aggregation** (1m/5m changes + volatility score)
- **Health endpoint** (`:8090/healthz`) & status badge in UI

### Strategy & Bot Automation

- **Mean reversion prototype strategy** (Go-based orchestration placeholder) with safe period guard
- **Bot Service** (create/list/start/stop/status) persisting to `data/bots.json`
- **Strategy linkage**: Bot start launches strategy and stores `strategy_id`
- **Momentum & OHLC visualizations** for rapid exploratory strategy tuning

### Modern Architecture

- **Polyglot services** (Go trading + Rust risk + Python strategy playground + React frontend)
- **gRPC + Envoy (gRPC-Web)** boundary for browser clients
- **Streaming-first design** (ticks, order books, future risk events)
- **Persistence-light** (JSON bot registry) – easy to swap for DB later

## 🚀 Getting Started

### For Traders and Analysts

1. **Access the Platform**
   - Visit the web interface at `https://app.aetherion.cloud` (planned production domain)
   - Create your account or sign in
   - Start monitoring real-time market data

2. **Configure Your Strategy**
   - Set your risk parameters (position limits, stop losses)
   - Adjust mean reversion settings (lookback period, entry/exit thresholds)
   - Define your preferred symbols and markets

3. **Monitor Performance**
   - View real-time profit/loss
   - Track risk metrics and exposure
   - Analyze strategy performance

### For Developers

Want to extend Aetherion or run your own instance? See [Developer Documentation](DEVELOPER.md) for setup, protos, and contribution workflow.

## 🏗️ Architecture Highlights

Aetherion uses a polyglot microservices architecture with each component optimized for its role:

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │────│  Envoy Proxy    │────│   Backend       │
│   (React App)   │    │   (Port 8080)   │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                    ┌─────────▼─────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
                    │   Trading Service │    │   Risk Service    │    │ Strategy Service  │
                    │      (Go)         │    │     (Rust)        │    │    (Python)       │
                    │   Port 50051      │    │   Port 50052      │    │   Orchestrator    │
                    └───────────────────┘    └───────────────────┘    └───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Market Data     │
                    │   (WebSocket)     │
                    │ Coinbase/Binance  │
                    └───────────────────┘
```

- **Frontend (React)** - Navigation: Landing, Bots, Develop Bot, Momentum, About/News/Contact
- **Trading Service (Go)** - Market data feed, strategies, momentum metrics, auth
- **Bot Service (Go)** - Lifecycle management & persistence (same process for now)
- **Risk Service (Rust)** - Planned: VaR, limits engine
- **Strategy Engine (Python)** - Experimental algorithm prototyping

All components communicate via gRPC for optimal performance and reliability.

## 📊 Supported Markets

Current data source:

- **Coinbase** websocket (spot crypto) – dynamic symbols (override startup set: `DEFAULT_SYMBOLS="BTC-USD,ETH-USD,SOL-USD,ILV-USD"`)
- (Planned) Binance + others as fallback extensions

## 🛡️ Risk Management

Early-stage risk roadmap:

- Position & exposure tracking (baseline implemented)
- VaR & stress testing (Rust engine scaffolding)
- Pre-trade checks & circuit breakers (future)

## 📚 Documentation

- [User Guide](docs/USER_GUIDE.md) - How to use the UI & features
- [API Reference](docs/API.md) - gRPC service + message overview
- [Developer Guide](DEVELOPER.md) - Setup, architecture, protos
- (Planned) Strategy & Risk deep-dive docs

## 🤝 Support

- **GitHub Issues** - Report bugs or request features
- **Documentation** - Comprehensive guides and API references
- **Community** - Join our discussions and share strategies

## 📄 License

Aetherion is open source software licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Ready to explore?** Visit `https://app.aetherion.cloud` (when live) or run locally via `make run`. See [Developer Guide](DEVELOPER.md) to hack on services.
