import trading_api_pb2 as _trading_api_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class BotConfig(_message.Message):
    __slots__ = ("bot_id", "symbol", "strategy", "parameters", "is_active", "created_at_unix_ms")
    class ParametersEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    BOT_ID_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    STRATEGY_FIELD_NUMBER: _ClassVar[int]
    PARAMETERS_FIELD_NUMBER: _ClassVar[int]
    IS_ACTIVE_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_UNIX_MS_FIELD_NUMBER: _ClassVar[int]
    bot_id: str
    symbol: str
    strategy: str
    parameters: _containers.ScalarMap[str, str]
    is_active: bool
    created_at_unix_ms: int
    def __init__(self, bot_id: _Optional[str] = ..., symbol: _Optional[str] = ..., strategy: _Optional[str] = ..., parameters: _Optional[_Mapping[str, str]] = ..., is_active: bool = ..., created_at_unix_ms: _Optional[int] = ...) -> None: ...

class CreateBotRequest(_message.Message):
    __slots__ = ("symbol", "strategy", "parameters")
    class ParametersEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    STRATEGY_FIELD_NUMBER: _ClassVar[int]
    PARAMETERS_FIELD_NUMBER: _ClassVar[int]
    symbol: str
    strategy: str
    parameters: _containers.ScalarMap[str, str]
    def __init__(self, symbol: _Optional[str] = ..., strategy: _Optional[str] = ..., parameters: _Optional[_Mapping[str, str]] = ...) -> None: ...

class BotIdRequest(_message.Message):
    __slots__ = ("bot_id",)
    BOT_ID_FIELD_NUMBER: _ClassVar[int]
    bot_id: str
    def __init__(self, bot_id: _Optional[str] = ...) -> None: ...

class BotList(_message.Message):
    __slots__ = ("bots",)
    BOTS_FIELD_NUMBER: _ClassVar[int]
    bots: _containers.RepeatedCompositeFieldContainer[BotConfig]
    def __init__(self, bots: _Optional[_Iterable[_Union[BotConfig, _Mapping]]] = ...) -> None: ...
