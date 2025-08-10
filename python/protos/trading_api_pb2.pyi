from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
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
    __slots__ = ("success", "message")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    def __init__(self, success: bool = ..., message: _Optional[str] = ...) -> None: ...

class PortfolioRequest(_message.Message):
    __slots__ = ("account_id",)
    ACCOUNT_ID_FIELD_NUMBER: _ClassVar[int]
    account_id: str
    def __init__(self, account_id: _Optional[str] = ...) -> None: ...

class PortfolioResponse(_message.Message):
    __slots__ = ("positions", "total_value_usd")
    class PositionsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    POSITIONS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_VALUE_USD_FIELD_NUMBER: _ClassVar[int]
    positions: _containers.ScalarMap[str, float]
    total_value_usd: float
    def __init__(self, positions: _Optional[_Mapping[str, float]] = ..., total_value_usd: _Optional[float] = ...) -> None: ...

class VaRRequest(_message.Message):
    __slots__ = ("current_portfolio", "risk_model")
    CURRENT_PORTFOLIO_FIELD_NUMBER: _ClassVar[int]
    RISK_MODEL_FIELD_NUMBER: _ClassVar[int]
    current_portfolio: PortfolioResponse
    risk_model: str
    def __init__(self, current_portfolio: _Optional[_Union[PortfolioResponse, _Mapping]] = ..., risk_model: _Optional[str] = ...) -> None: ...

class VaRResponse(_message.Message):
    __slots__ = ("value_at_risk",)
    VALUE_AT_RISK_FIELD_NUMBER: _ClassVar[int]
    value_at_risk: float
    def __init__(self, value_at_risk: _Optional[float] = ...) -> None: ...
