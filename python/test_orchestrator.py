import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from orchestrator import TradingOrchestrator
from protos import trading_api_pb2

@pytest.fixture
def orchestrator(monkeypatch):
    monkeypatch.setenv("ORCHESTRATOR_USER_ID", "test_user")
    with patch('orchestrator.load_backfill_prices') as mock_load_prices:
        mock_load_prices.return_value = [100] * 20
        orchestrator = TradingOrchestrator()
        return orchestrator

@pytest.mark.asyncio
async def test_process_bot_buy_signal_risk_ok(orchestrator):
    """Test process_bot when there is a buy signal and risk is acceptable."""
    # 1. Setup Mocks
    mock_bot = MagicMock()
    mock_bot.bot_id = "test_bot_id"
    mock_bot.name = "TestBot"
    mock_bot.symbol = "BTC-USD"
    mock_bot.is_active = True
    mock_bot.account_value = 100000.0
    mock_bot.strategy = 'mean_reversion'

    mock_trading_channel = AsyncMock()
    mock_risk_channel = AsyncMock()
    mock_http_session = AsyncMock()

    # Mock gRPC stubs
    mock_bot_stub = MagicMock()
    mock_risk_stub = MagicMock()
    mock_order_stub = MagicMock()

    # Mock the stub constructors to return our mocks
    with patch('orchestrator.trading_api_pb2_grpc.BotServiceStub', return_value=mock_bot_stub), \
         patch('orchestrator.trading_api_pb2_grpc.RiskServiceStub', return_value=mock_risk_stub), \
         patch('orchestrator.trading_api_pb2_grpc.OrderServiceStub', return_value=mock_order_stub):

        # Mock async functions and methods
        with patch('orchestrator.fetch_binance_price_async', new_callable=AsyncMock) as mock_fetch_price, \
             patch('orchestrator.update_bot_state', new_callable=AsyncMock) as mock_update_state:

            mock_fetch_price.return_value = 110.0

            # Mock strategy signal
            orchestrator.strategy.generate_signal = MagicMock(return_value={
                'action': 'buy',
                'size': 1.0,
                'zscore': 2.5,
                'stop_loss': 105.0
            })

            # Mock VaR response
            mock_var_response = trading_api_pb2.VaRResponse(
                value_at_risk=trading_api_pb2.DecimalValue(units=500, nanos=0)
            )
            mock_risk_stub.CalculateVaR = AsyncMock(return_value=mock_var_response)

            # Mock order response
            mock_order_response = trading_api_pb2.Order(status=trading_api_pb2.FILLED)
            mock_order_stub.CreateOrder = AsyncMock(return_value=mock_order_response)

            # 2. Call the method under test
            await orchestrator.process_bot(
                mock_bot, 
                mock_trading_channel, 
                mock_risk_channel, 
                [], 
                mock_http_session
            )

            # 3. Assertions
            mock_fetch_price.assert_called_once_with(mock_http_session, "BTCUSD")
            orchestrator.strategy.generate_signal.assert_called_once_with(110.0, 100000.0)
            mock_risk_stub.CalculateVaR.assert_called_once()
            mock_order_stub.CreateOrder.assert_called_once()
            mock_update_state.assert_called_once()

@pytest.mark.asyncio
async def test_process_bot_inactive(orchestrator):
    """Test that an inactive bot is skipped."""
    mock_bot = MagicMock()
    mock_bot.is_active = False
    mock_bot.name = "InactiveBot"

    with patch('orchestrator.fetch_binance_price_async', new_callable=AsyncMock) as mock_fetch_price:
        await orchestrator.process_bot(mock_bot, None, None, None, None)
        mock_fetch_price.assert_not_called()
