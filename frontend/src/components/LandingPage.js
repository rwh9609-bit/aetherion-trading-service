import React from 'react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <>
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
          .gradient-text {
            background: linear-gradient(to right, #6EE7B7, #3B82F6, #9333EA);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .glow-effect {
            box-shadow: 0 0 15px rgba(110, 231, 183, 0.4), 0 0 30px rgba(59, 130, 246, 0.3);
          }
          .code-block {
            font-family: 'Fira Code', monospace;
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
        `}
      </style>
      <div className="bg-gray-900 text-gray-200">
        {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900 bg-opacity-80 backdrop-blur-md z-50 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tighter">Aetherion Engine</h1>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors">Architecture</a>
            <a href="https://github.com/rwh9609-bit/multilanguage" className="hover:text-emerald-400 transition-colors">GitHub</a>
          </nav>
          <a
            href="#quickstart"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105"
            onClick={e => {
              e.preventDefault();
              if (onGetStarted) onGetStarted();
            }}
          >
            Get Started
          </a>
        </div>
      </header>

        {/* Hero Section */}
        <main className="pt-24">
          <section className="text-center py-20 px-6">
            <div className="container mx-auto">
              <h2 className="text-5xl md:text-7xl font-black mb-4 leading-tight">
                Modern <span className="gradient-text">Trading Architecture</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                Aetherion is a next-generation, cloud-native trading engine designed for ambitious quants and developers. Create, deploy, and scale your strategies seamlessly with our powerful, polyglot architecture.
              </p>
              <div className="flex justify-center space-x-4">
                <a href="#architecture" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">View Architecture</a>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-20 bg-gray-800 bg-opacity-50">
            <div className="container mx-auto px-6">
              <h3 className="text-4xl font-bold text-center mb-12">Why Aetherion?</h3>
              <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1: Risk Management */}
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 glow-effect">
                  <h4 className="text-2xl font-bold mb-3 text-emerald-400">Advanced Risk Management</h4>
                  <p className="text-gray-400">
                    Built with Rust for safety-critical calculations, our risk service provides real-time VaR analysis, position monitoring, and automated risk controls with microsecond precision.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-400">
                    <li>• Real-time Value at Risk (VaR)</li>
                    <li>• Position-level risk limits</li>
                    <li>• Portfolio exposure controls</li>
                    <li>• Configurable risk parameters</li>
                  </ul>
                </div>
                {/* Feature 2: Market Data */}
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 glow-effect">
                  <h4 className="text-2xl font-bold mb-3 text-blue-400">Reliable Market Data</h4>
                  <p className="text-gray-400">
                    Our Go-powered market data service provides redundant data feeds with automatic failover between Coinbase and Binance, ensuring uninterrupted trading operations.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-400">
                    <li>• Multi-exchange support</li>
                    <li>• Automatic failover</li>
                    <li>• Real-time price feeds</li>
                    <li>• HTTP monitoring endpoints</li>
                  </ul>
                </div>
                {/* Feature 3: Trading Strategies */}
                <div className="bg-gray-900 p-8 rounded-xl border border-gray-700 glow-effect">
                  <h4 className="text-2xl font-bold mb-3 text-purple-400">Smart Trading Strategies</h4>
                  <p className="text-gray-400">
                    Implement sophisticated trading strategies in Python with our flexible strategy framework, including built-in mean reversion with dynamic position sizing.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-400">
                    <li>• Z-score based signals</li>
                    <li>• Dynamic position sizing</li>
                    <li>• Automated stop losses</li>
                    <li>• Risk-adjusted sizing</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture Section */}
          <section id="architecture" className="py-20">
            <div className="container mx-auto px-6">
              <h3 className="text-4xl font-bold text-center mb-12">A Polyglot Architecture That Performs</h3>
              <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">We use the best tool for every job, giving you a stable and powerful foundation for your quantitative strategies.</p>
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:space-x-8">
                  {/* Left Side: Services */}
                  <div className="md:w-1/2 space-y-4 mb-8 md:mb-0">
                    <div className="p-4 rounded-lg bg-gray-700">
                      <h5 className="font-bold text-lg text-emerald-400">Rust Risk Service (Port 50052)</h5>
                      <p className="text-sm text-gray-300">High-performance risk calculations and position monitoring</p>
                      <ul className="mt-2 text-xs text-gray-400 space-y-1">
                        <li>• Real-time VaR calculations</li>
                        <li>• Position risk assessment</li>
                        <li>• Pre-trade risk checks</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-700">
                      <h5 className="font-bold text-lg text-blue-400">Go Trading Service (Port 50051)</h5>
                      <p className="text-sm text-gray-300">Market data and trade execution gateway</p>
                      <ul className="mt-2 text-xs text-gray-400 space-y-1">
                        <li>• Multi-exchange price feeds</li>
                        <li>• Order execution</li>
                        <li>• HTTP monitoring (Port 8080)</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-700">
                      <h5 className="font-bold text-lg text-purple-400">Python Orchestrator</h5>
                      <p className="text-sm text-gray-300">Strategy implementation and coordination</p>
                      <ul className="mt-2 text-xs text-gray-400 space-y-1">
                        <li>• Mean reversion strategy</li>
                        <li>• Position management</li>
                        <li>• Risk limit enforcement</li>
                      </ul>
                    </div>
                  </div>
                  {/* Right Side: Diagram/Visual */}
                  <div className="md:w-1/2 bg-gray-900 rounded-lg p-6 flex items-center justify-center">
                    <p className="text-gray-500 text-center">
                      <img src="/arch.png" alt="Architecture Diagram" className="max-w-full h-auto" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700">
          <div className="container mx-auto px-6 py-8 text-center text-gray-400">
            <p>&copy; 2025 Aetherion. All rights reserved.</p>
            <p className="text-sm mt-2">Built for the next generation of quantitative trading.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
