from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Tick(_message.Message):
    __slots__ = ("symbol", "price", "timestamp_ns")
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    PRICE_FIELD_NUMBER: _ClassVar[int]
    TIMESTAMP_NS_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    price: float
    timestamp_ns: int
    def __init__(self, symbol: _Optional[str] = ..., price: _Optional[float] = ..., timestamp_ns: _Optional[int] = ...) -> None: ...

class TickStreamRequest(_message.Message):
    __slots__ = ("symbol",)
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    def __init__(self, symbol: _Optional[str] = ...) -> None: ...

class SymbolRequest(_message.Message):
    __slots__ = ("symbol",)
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    def __init__(self, symbol: _Optional[str] = ...) -> None: ...

class Empty(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class SymbolList(_message.Message):
    __slots__ = ("symbols",)
    SYMBOLS_FIELD_NUMBER: _ClassVar[int]
    symbols: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, symbols: _Optional[_Iterable[str]] = ...) -> None: ...

class StrategyRequest(_message.Message):
    __slots__ = ("strategy_id", "symbol", "parameters")
    class ParametersEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    STRATEGY_ID_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    PARAMETERS_FIELD_NUMBER: _ClassVar[int]
    strategy_id: str
    symbol: str
    parameters: _containers.ScalarMap[str, str]
    def __init__(self, strategy_id: _Optional[str] = ..., symbol: _Optional[str] = ..., parameters: _Optional[_Mapping[str, str]] = ...) -> None: ...

class StatusResponse(_message.Message):
    __slots__ = ("success", "message", "id")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    ID_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    id: str
    def __init__(self, success: bool = ..., message: _Optional[str] = ..., id: _Optional[str] = ...) -> None: ...

class PortfolioRequest(_message.Message):
    __slots__ = ("account_id",)
    ACCOUNT_ID_FIELD_NUMBER: _ClassVar[int]
    account_id: str
    def __init__(self, account_id: _Optional[str] = ...) -> None: ...

class Portfolio(_message.Message):
    __slots__ = ("positions", "total_value_usd", "last_price_change")
    class PositionsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    POSITIONS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_VALUE_USD_FIELD_NUMBER: _ClassVar[int]
    LAST_PRICE_CHANGE_FIELD_NUMBER: _ClassVar[int]
    positions: _containers.ScalarMap[str, float]
    total_value_usd: float
    last_price_change: float
    def __init__(self, positions: _Optional[_Mapping[str, float]] = ..., total_value_usd: _Optional[float] = ..., last_price_change: _Optional[float] = ...) -> None: ...

class VaRRequest(_message.Message):
    __slots__ = ("current_portfolio", "risk_model")
    CURRENT_PORTFOLIO_FIELD_NUMBER: _ClassVar[int]
    RISK_MODEL_FIELD_NUMBER: _ClassVar[int]
    current_portfolio: Portfolio
    risk_model: str
    def __init__(self, current_portfolio: _Optional[_Union[Portfolio, _Mapping]] = ..., risk_model: _Optional[str] = ...) -> None: ...

class VaRResponse(_message.Message):
    __slots__ = ("value_at_risk",)
    VALUE_AT_RISK_FIELD_NUMBER: _ClassVar[int]
    value_at_risk: float
    def __init__(self, value_at_risk: _Optional[float] = ...) -> None: ...

class OrderBookEntry(_message.Message):
    __slots__ = ("price", "size")
    PRICE_FIELD_NUMBER: _ClassVar[int]
    SIZE_FIELD_NUMBER: _ClassVar[int]
    price: float
    size: float
    def __init__(self, price: _Optional[float] = ..., size: _Optional[float] = ...) -> None: ...

class OrderBook(_message.Message):
    __slots__ = ("bids", "asks", "symbol")
    BIDS_FIELD_NUMBER: _ClassVar[int]
    ASKS_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    bids: _containers.RepeatedCompositeFieldContainer[OrderBookEntry]
    asks: _containers.RepeatedCompositeFieldContainer[OrderBookEntry]
    symbol: str
    def __init__(self, bids: _Optional[_Iterable[_Union[OrderBookEntry, _Mapping]]] = ..., asks: _Optional[_Iterable[_Union[OrderBookEntry, _Mapping]]] = ..., symbol: _Optional[str] = ...) -> None: ...

class OrderBookRequest(_message.Message):
    __slots__ = ("symbol",)
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    def __init__(self, symbol: _Optional[str] = ...) -> None: ...

class MomentumRequest(_message.Message):
    __slots__ = ("symbols",)
    SYMBOLS_FIELD_NUMBER: _ClassVar[int]
    symbols: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, symbols: _Optional[_Iterable[str]] = ...) -> None: ...

class MomentumMetric(_message.Message):
    __slots__ = ("symbol", "last_price", "pct_change_1m", "pct_change_5m", "volatility", "momentum_score")
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    LAST_PRICE_FIELD_NUMBER: _ClassVar[int]
    PCT_CHANGE_1M_FIELD_NUMBER: _ClassVar[int]
    PCT_CHANGE_5M_FIELD_NUMBER: _ClassVar[int]
    VOLATILITY_FIELD_NUMBER: _ClassVar[int]
    MOMENTUM_SCORE_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    last_price: float
    pct_change_1m: float
    pct_change_5m: float
    volatility: float
    momentum_score: float
    def __init__(self, symbol: _Optional[str] = ..., last_price: _Optional[float] = ..., pct_change_1m: _Optional[float] = ..., pct_change_5m: _Optional[float] = ..., volatility: _Optional[float] = ..., momentum_score: _Optional[float] = ...) -> None: ...

class MomentumResponse(_message.Message):
    __slots__ = ("metrics", "generated_at_unix_ms")
    METRICS_FIELD_NUMBER: _ClassVar[int]
    GENERATED_AT_UNIX_MS_FIELD_NUMBER: _ClassVar[int]
    metrics: _containers.RepeatedCompositeFieldContainer[MomentumMetric]
    generated_at_unix_ms: int
    def __init__(self, metrics: _Optional[_Iterable[_Union[MomentumMetric, _Mapping]]] = ..., generated_at_unix_ms: _Optional[int] = ...) -> None: ...

class BotConfig(_message.Message):
    __slots__ = ("id", "name", "symbol", "strategy", "parameters", "active", "created_at_unix")
    class ParametersEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    STRATEGY_FIELD_NUMBER: _ClassVar[int]
    PARAMETERS_FIELD_NUMBER: _ClassVar[int]
    ACTIVE_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_UNIX_FIELD_NUMBER: _ClassVar[int]
    id: str
    name: str
    symbol: str
    strategy: str
    parameters: _containers.ScalarMap[str, str]
    active: bool
    created_at_unix: int
    def __init__(self, id: _Optional[str] = ..., name: _Optional[str] = ..., symbol: _Optional[str] = ..., strategy: _Optional[str] = ..., parameters: _Optional[_Mapping[str, str]] = ..., active: bool = ..., created_at_unix: _Optional[int] = ...) -> None: ...

class CreateBotRequest(_message.Message):
    __slots__ = ("name", "symbol", "strategy", "parameters")
    class ParametersEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    NAME_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    STRATEGY_FIELD_NUMBER: _ClassVar[int]
    PARAMETERS_FIELD_NUMBER: _ClassVar[int]
    name: str
    symbol: str
    strategy: str
    parameters: _containers.ScalarMap[str, str]
    def __init__(self, name: _Optional[str] = ..., symbol: _Optional[str] = ..., strategy: _Optional[str] = ..., parameters: _Optional[_Mapping[str, str]] = ...) -> None: ...

class BotIdRequest(_message.Message):
    __slots__ = ("id",)
    ID_FIELD_NUMBER: _ClassVar[int]
    id: str
    def __init__(self, id: _Optional[str] = ...) -> None: ...

class BotList(_message.Message):
    __slots__ = ("bots",)
    BOTS_FIELD_NUMBER: _ClassVar[int]
    bots: _containers.RepeatedCompositeFieldContainer[BotConfig]
    def __init__(self, bots: _Optional[_Iterable[_Union[BotConfig, _Mapping]]] = ...) -> None: ...

class RegisterRequest(_message.Message):
    __slots__ = ("username", "password")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ...) -> None: ...

class AuthRequest(_message.Message):
    __slots__ = ("username", "password")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ...) -> None: ...

class AuthResponse(_message.Message):
    __slots__ = ("success", "message", "token", "expires_at_unix")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_UNIX_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    token: str
    expires_at_unix: int
    def __init__(self, success: bool = ..., message: _Optional[str] = ..., token: _Optional[str] = ..., expires_at_unix: _Optional[int] = ...) -> None: ...

class TradeRequest(_message.Message):
    __slots__ = ("symbol", "side", "size", "price")
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    SIDE_FIELD_NUMBER: _ClassVar[int]
    SIZE_FIELD_NUMBER: _ClassVar[int]
    PRICE_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    side: str
    size: float
    price: float
    def __init__(self, symbol: _Optional[str] = ..., side: _Optional[str] = ..., size: _Optional[float] = ..., price: _Optional[float] = ...) -> None: ...

class TradeResponse(_message.Message):
    __slots__ = ("accepted", "message", "executed_price", "pnl")
    ACCEPTED_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    EXECUTED_PRICE_FIELD_NUMBER: _ClassVar[int]
    PNL_FIELD_NUMBER: _ClassVar[int]
    accepted: bool
    message: str
    executed_price: float
    pnl: float
    def __init__(self, accepted: bool = ..., message: _Optional[str] = ..., executed_price: _Optional[float] = ..., pnl: _Optional[float] = ...) -> None: ...
