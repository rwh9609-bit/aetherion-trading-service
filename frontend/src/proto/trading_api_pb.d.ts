import * as jspb from 'google-protobuf'



export class Tick extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): Tick;

  getPrice(): number;
  setPrice(value: number): Tick;

  getTimestampNs(): number;
  setTimestampNs(value: number): Tick;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Tick.AsObject;
  static toObject(includeInstance: boolean, msg: Tick): Tick.AsObject;
  static serializeBinaryToWriter(message: Tick, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Tick;
  static deserializeBinaryFromReader(message: Tick, reader: jspb.BinaryReader): Tick;
}

export namespace Tick {
  export type AsObject = {
    symbol: string,
    price: number,
    timestampNs: number,
  }
}

export class TickStreamRequest extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): TickStreamRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TickStreamRequest.AsObject;
  static toObject(includeInstance: boolean, msg: TickStreamRequest): TickStreamRequest.AsObject;
  static serializeBinaryToWriter(message: TickStreamRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TickStreamRequest;
  static deserializeBinaryFromReader(message: TickStreamRequest, reader: jspb.BinaryReader): TickStreamRequest;
}

export namespace TickStreamRequest {
  export type AsObject = {
    symbol: string,
  }
}

export class SymbolRequest extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): SymbolRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SymbolRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SymbolRequest): SymbolRequest.AsObject;
  static serializeBinaryToWriter(message: SymbolRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SymbolRequest;
  static deserializeBinaryFromReader(message: SymbolRequest, reader: jspb.BinaryReader): SymbolRequest;
}

export namespace SymbolRequest {
  export type AsObject = {
    symbol: string,
  }
}

export class Empty extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Empty.AsObject;
  static toObject(includeInstance: boolean, msg: Empty): Empty.AsObject;
  static serializeBinaryToWriter(message: Empty, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Empty;
  static deserializeBinaryFromReader(message: Empty, reader: jspb.BinaryReader): Empty;
}

export namespace Empty {
  export type AsObject = {
  }
}

export class SymbolList extends jspb.Message {
  getSymbolsList(): Array<string>;
  setSymbolsList(value: Array<string>): SymbolList;
  clearSymbolsList(): SymbolList;
  addSymbols(value: string, index?: number): SymbolList;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SymbolList.AsObject;
  static toObject(includeInstance: boolean, msg: SymbolList): SymbolList.AsObject;
  static serializeBinaryToWriter(message: SymbolList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SymbolList;
  static deserializeBinaryFromReader(message: SymbolList, reader: jspb.BinaryReader): SymbolList;
}

export namespace SymbolList {
  export type AsObject = {
    symbolsList: Array<string>,
  }
}

export class StrategyRequest extends jspb.Message {
  getStrategyId(): string;
  setStrategyId(value: string): StrategyRequest;

  getSymbol(): string;
  setSymbol(value: string): StrategyRequest;

  getParametersMap(): jspb.Map<string, string>;
  clearParametersMap(): StrategyRequest;

  getUserId(): string;
  setUserId(value: string): StrategyRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StrategyRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StrategyRequest): StrategyRequest.AsObject;
  static serializeBinaryToWriter(message: StrategyRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StrategyRequest;
  static deserializeBinaryFromReader(message: StrategyRequest, reader: jspb.BinaryReader): StrategyRequest;
}

export namespace StrategyRequest {
  export type AsObject = {
    strategyId: string,
    symbol: string,
    parametersMap: Array<[string, string]>,
    userId: string,
  }
}

export class StatusResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): StatusResponse;

  getMessage(): string;
  setMessage(value: string): StatusResponse;

  getId(): string;
  setId(value: string): StatusResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StatusResponse.AsObject;
  static toObject(includeInstance: boolean, msg: StatusResponse): StatusResponse.AsObject;
  static serializeBinaryToWriter(message: StatusResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StatusResponse;
  static deserializeBinaryFromReader(message: StatusResponse, reader: jspb.BinaryReader): StatusResponse;
}

export namespace StatusResponse {
  export type AsObject = {
    success: boolean,
    message: string,
    id: string,
  }
}

export class PortfolioRequest extends jspb.Message {
  getAccountId(): string;
  setAccountId(value: string): PortfolioRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): PortfolioRequest.AsObject;
  static toObject(includeInstance: boolean, msg: PortfolioRequest): PortfolioRequest.AsObject;
  static serializeBinaryToWriter(message: PortfolioRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): PortfolioRequest;
  static deserializeBinaryFromReader(message: PortfolioRequest, reader: jspb.BinaryReader): PortfolioRequest;
}

export namespace PortfolioRequest {
  export type AsObject = {
    accountId: string,
  }
}

export class Portfolio extends jspb.Message {
  getPositionsMap(): jspb.Map<string, number>;
  clearPositionsMap(): Portfolio;

  getTotalValueUsd(): number;
  setTotalValueUsd(value: number): Portfolio;

  getLastPriceChange(): number;
  setLastPriceChange(value: number): Portfolio;
  hasLastPriceChange(): boolean;
  clearLastPriceChange(): Portfolio;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Portfolio.AsObject;
  static toObject(includeInstance: boolean, msg: Portfolio): Portfolio.AsObject;
  static serializeBinaryToWriter(message: Portfolio, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Portfolio;
  static deserializeBinaryFromReader(message: Portfolio, reader: jspb.BinaryReader): Portfolio;
}

export namespace Portfolio {
  export type AsObject = {
    positionsMap: Array<[string, number]>,
    totalValueUsd: number,
    lastPriceChange?: number,
  }

  export enum LastPriceChangeCase { 
    _LAST_PRICE_CHANGE_NOT_SET = 0,
    LAST_PRICE_CHANGE = 3,
  }
}

export class VaRRequest extends jspb.Message {
  getCurrentPortfolio(): Portfolio | undefined;
  setCurrentPortfolio(value?: Portfolio): VaRRequest;
  hasCurrentPortfolio(): boolean;
  clearCurrentPortfolio(): VaRRequest;

  getRiskModel(): string;
  setRiskModel(value: string): VaRRequest;

  getConfidenceLevel(): number;
  setConfidenceLevel(value: number): VaRRequest;

  getHorizonDays(): number;
  setHorizonDays(value: number): VaRRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VaRRequest.AsObject;
  static toObject(includeInstance: boolean, msg: VaRRequest): VaRRequest.AsObject;
  static serializeBinaryToWriter(message: VaRRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VaRRequest;
  static deserializeBinaryFromReader(message: VaRRequest, reader: jspb.BinaryReader): VaRRequest;
}

export namespace VaRRequest {
  export type AsObject = {
    currentPortfolio?: Portfolio.AsObject,
    riskModel: string,
    confidenceLevel: number,
    horizonDays: number,
  }
}

export class VaRResponse extends jspb.Message {
  getValueAtRisk(): number;
  setValueAtRisk(value: number): VaRResponse;

  getAssetNamesList(): Array<string>;
  setAssetNamesList(value: Array<string>): VaRResponse;
  clearAssetNamesList(): VaRResponse;
  addAssetNames(value: string, index?: number): VaRResponse;

  getCorrelationMatrixList(): Array<number>;
  setCorrelationMatrixList(value: Array<number>): VaRResponse;
  clearCorrelationMatrixList(): VaRResponse;
  addCorrelationMatrix(value: number, index?: number): VaRResponse;

  getVolatilityPerAssetList(): Array<number>;
  setVolatilityPerAssetList(value: Array<number>): VaRResponse;
  clearVolatilityPerAssetList(): VaRResponse;
  addVolatilityPerAsset(value: number, index?: number): VaRResponse;

  getSimulationMode(): string;
  setSimulationMode(value: string): VaRResponse;

  getLastUpdate(): string;
  setLastUpdate(value: string): VaRResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): VaRResponse.AsObject;
  static toObject(includeInstance: boolean, msg: VaRResponse): VaRResponse.AsObject;
  static serializeBinaryToWriter(message: VaRResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): VaRResponse;
  static deserializeBinaryFromReader(message: VaRResponse, reader: jspb.BinaryReader): VaRResponse;
}

export namespace VaRResponse {
  export type AsObject = {
    valueAtRisk: number,
    assetNamesList: Array<string>,
    correlationMatrixList: Array<number>,
    volatilityPerAssetList: Array<number>,
    simulationMode: string,
    lastUpdate: string,
  }
}

export class TradeRequest extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): TradeRequest;

  getSide(): string;
  setSide(value: string): TradeRequest;

  getSize(): number;
  setSize(value: number): TradeRequest;

  getPrice(): number;
  setPrice(value: number): TradeRequest;

  getStrategyId(): string;
  setStrategyId(value: string): TradeRequest;

  getUserId(): string;
  setUserId(value: string): TradeRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TradeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: TradeRequest): TradeRequest.AsObject;
  static serializeBinaryToWriter(message: TradeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TradeRequest;
  static deserializeBinaryFromReader(message: TradeRequest, reader: jspb.BinaryReader): TradeRequest;
}

export namespace TradeRequest {
  export type AsObject = {
    symbol: string,
    side: string,
    size: number,
    price: number,
    strategyId: string,
    userId: string,
  }
}

export class TradeResponse extends jspb.Message {
  getAccepted(): boolean;
  setAccepted(value: boolean): TradeResponse;

  getMessage(): string;
  setMessage(value: string): TradeResponse;

  getExecutedPrice(): number;
  setExecutedPrice(value: number): TradeResponse;

  getPnl(): number;
  setPnl(value: number): TradeResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TradeResponse.AsObject;
  static toObject(includeInstance: boolean, msg: TradeResponse): TradeResponse.AsObject;
  static serializeBinaryToWriter(message: TradeResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TradeResponse;
  static deserializeBinaryFromReader(message: TradeResponse, reader: jspb.BinaryReader): TradeResponse;
}

export namespace TradeResponse {
  export type AsObject = {
    accepted: boolean,
    message: string,
    executedPrice: number,
    pnl: number,
  }
}

export class Trade extends jspb.Message {
  getTradeId(): string;
  setTradeId(value: string): Trade;

  getSymbol(): string;
  setSymbol(value: string): Trade;

  getSide(): string;
  setSide(value: string): Trade;

  getQuantity(): number;
  setQuantity(value: number): Trade;

  getPrice(): number;
  setPrice(value: number): Trade;

  getExecutedAt(): number;
  setExecutedAt(value: number): Trade;

  getStrategyId(): string;
  setStrategyId(value: string): Trade;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Trade.AsObject;
  static toObject(includeInstance: boolean, msg: Trade): Trade.AsObject;
  static serializeBinaryToWriter(message: Trade, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Trade;
  static deserializeBinaryFromReader(message: Trade, reader: jspb.BinaryReader): Trade;
}

export namespace Trade {
  export type AsObject = {
    tradeId: string,
    symbol: string,
    side: string,
    quantity: number,
    price: number,
    executedAt: number,
    strategyId: string,
  }
}

export class TradeHistoryRequest extends jspb.Message {
  getUserId(): string;
  setUserId(value: string): TradeHistoryRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TradeHistoryRequest.AsObject;
  static toObject(includeInstance: boolean, msg: TradeHistoryRequest): TradeHistoryRequest.AsObject;
  static serializeBinaryToWriter(message: TradeHistoryRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TradeHistoryRequest;
  static deserializeBinaryFromReader(message: TradeHistoryRequest, reader: jspb.BinaryReader): TradeHistoryRequest;
}

export namespace TradeHistoryRequest {
  export type AsObject = {
    userId: string,
  }
}

export class TradeHistoryResponse extends jspb.Message {
  getTradesList(): Array<Trade>;
  setTradesList(value: Array<Trade>): TradeHistoryResponse;
  clearTradesList(): TradeHistoryResponse;
  addTrades(value?: Trade, index?: number): Trade;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TradeHistoryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: TradeHistoryResponse): TradeHistoryResponse.AsObject;
  static serializeBinaryToWriter(message: TradeHistoryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TradeHistoryResponse;
  static deserializeBinaryFromReader(message: TradeHistoryResponse, reader: jspb.BinaryReader): TradeHistoryResponse;
}

export namespace TradeHistoryResponse {
  export type AsObject = {
    tradesList: Array<Trade.AsObject>,
  }
}

export class OrderBookEntry extends jspb.Message {
  getPrice(): number;
  setPrice(value: number): OrderBookEntry;

  getSize(): number;
  setSize(value: number): OrderBookEntry;

  getTimestamp(): number;
  setTimestamp(value: number): OrderBookEntry;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OrderBookEntry.AsObject;
  static toObject(includeInstance: boolean, msg: OrderBookEntry): OrderBookEntry.AsObject;
  static serializeBinaryToWriter(message: OrderBookEntry, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OrderBookEntry;
  static deserializeBinaryFromReader(message: OrderBookEntry, reader: jspb.BinaryReader): OrderBookEntry;
}

export namespace OrderBookEntry {
  export type AsObject = {
    price: number,
    size: number,
    timestamp: number,
  }
}

export class OrderBook extends jspb.Message {
  getBidsList(): Array<OrderBookEntry>;
  setBidsList(value: Array<OrderBookEntry>): OrderBook;
  clearBidsList(): OrderBook;
  addBids(value?: OrderBookEntry, index?: number): OrderBookEntry;

  getAsksList(): Array<OrderBookEntry>;
  setAsksList(value: Array<OrderBookEntry>): OrderBook;
  clearAsksList(): OrderBook;
  addAsks(value?: OrderBookEntry, index?: number): OrderBookEntry;

  getSymbol(): string;
  setSymbol(value: string): OrderBook;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OrderBook.AsObject;
  static toObject(includeInstance: boolean, msg: OrderBook): OrderBook.AsObject;
  static serializeBinaryToWriter(message: OrderBook, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OrderBook;
  static deserializeBinaryFromReader(message: OrderBook, reader: jspb.BinaryReader): OrderBook;
}

export namespace OrderBook {
  export type AsObject = {
    bidsList: Array<OrderBookEntry.AsObject>,
    asksList: Array<OrderBookEntry.AsObject>,
    symbol: string,
  }
}

export class OrderBookRequest extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): OrderBookRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OrderBookRequest.AsObject;
  static toObject(includeInstance: boolean, msg: OrderBookRequest): OrderBookRequest.AsObject;
  static serializeBinaryToWriter(message: OrderBookRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OrderBookRequest;
  static deserializeBinaryFromReader(message: OrderBookRequest, reader: jspb.BinaryReader): OrderBookRequest;
}

export namespace OrderBookRequest {
  export type AsObject = {
    symbol: string,
  }
}

export class MomentumRequest extends jspb.Message {
  getSymbolsList(): Array<string>;
  setSymbolsList(value: Array<string>): MomentumRequest;
  clearSymbolsList(): MomentumRequest;
  addSymbols(value: string, index?: number): MomentumRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MomentumRequest.AsObject;
  static toObject(includeInstance: boolean, msg: MomentumRequest): MomentumRequest.AsObject;
  static serializeBinaryToWriter(message: MomentumRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MomentumRequest;
  static deserializeBinaryFromReader(message: MomentumRequest, reader: jspb.BinaryReader): MomentumRequest;
}

export namespace MomentumRequest {
  export type AsObject = {
    symbolsList: Array<string>,
  }
}

export class MomentumMetric extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): MomentumMetric;

  getLastPrice(): number;
  setLastPrice(value: number): MomentumMetric;

  getPctChange1m(): number;
  setPctChange1m(value: number): MomentumMetric;

  getPctChange5m(): number;
  setPctChange5m(value: number): MomentumMetric;

  getVolatility(): number;
  setVolatility(value: number): MomentumMetric;

  getMomentumScore(): number;
  setMomentumScore(value: number): MomentumMetric;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MomentumMetric.AsObject;
  static toObject(includeInstance: boolean, msg: MomentumMetric): MomentumMetric.AsObject;
  static serializeBinaryToWriter(message: MomentumMetric, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MomentumMetric;
  static deserializeBinaryFromReader(message: MomentumMetric, reader: jspb.BinaryReader): MomentumMetric;
}

export namespace MomentumMetric {
  export type AsObject = {
    symbol: string,
    lastPrice: number,
    pctChange1m: number,
    pctChange5m: number,
    volatility: number,
    momentumScore: number,
  }
}

export class MomentumResponse extends jspb.Message {
  getMetricsList(): Array<MomentumMetric>;
  setMetricsList(value: Array<MomentumMetric>): MomentumResponse;
  clearMetricsList(): MomentumResponse;
  addMetrics(value?: MomentumMetric, index?: number): MomentumMetric;

  getGeneratedAtUnixMs(): number;
  setGeneratedAtUnixMs(value: number): MomentumResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MomentumResponse.AsObject;
  static toObject(includeInstance: boolean, msg: MomentumResponse): MomentumResponse.AsObject;
  static serializeBinaryToWriter(message: MomentumResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MomentumResponse;
  static deserializeBinaryFromReader(message: MomentumResponse, reader: jspb.BinaryReader): MomentumResponse;
}

export namespace MomentumResponse {
  export type AsObject = {
    metricsList: Array<MomentumMetric.AsObject>,
    generatedAtUnixMs: number,
  }
}

export class RegisterRequest extends jspb.Message {
  getUsername(): string;
  setUsername(value: string): RegisterRequest;

  getPassword(): string;
  setPassword(value: string): RegisterRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RegisterRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RegisterRequest): RegisterRequest.AsObject;
  static serializeBinaryToWriter(message: RegisterRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RegisterRequest;
  static deserializeBinaryFromReader(message: RegisterRequest, reader: jspb.BinaryReader): RegisterRequest;
}

export namespace RegisterRequest {
  export type AsObject = {
    username: string,
    password: string,
  }
}

export class AuthRequest extends jspb.Message {
  getUsername(): string;
  setUsername(value: string): AuthRequest;

  getPassword(): string;
  setPassword(value: string): AuthRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AuthRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AuthRequest): AuthRequest.AsObject;
  static serializeBinaryToWriter(message: AuthRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuthRequest;
  static deserializeBinaryFromReader(message: AuthRequest, reader: jspb.BinaryReader): AuthRequest;
}

export namespace AuthRequest {
  export type AsObject = {
    username: string,
    password: string,
  }
}

export class AuthResponse extends jspb.Message {
  getSuccess(): boolean;
  setSuccess(value: boolean): AuthResponse;

  getMessage(): string;
  setMessage(value: string): AuthResponse;

  getToken(): string;
  setToken(value: string): AuthResponse;

  getExpiresAtUnix(): number;
  setExpiresAtUnix(value: number): AuthResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AuthResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AuthResponse): AuthResponse.AsObject;
  static serializeBinaryToWriter(message: AuthResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AuthResponse;
  static deserializeBinaryFromReader(message: AuthResponse, reader: jspb.BinaryReader): AuthResponse;
}

export namespace AuthResponse {
  export type AsObject = {
    success: boolean,
    message: string,
    token: string,
    expiresAtUnix: number,
  }
}

export class BotConfig extends jspb.Message {
  getBotId(): string;
  setBotId(value: string): BotConfig;

  getSymbol(): string;
  setSymbol(value: string): BotConfig;

  getStrategy(): string;
  setStrategy(value: string): BotConfig;

  getParametersMap(): jspb.Map<string, string>;
  clearParametersMap(): BotConfig;

  getIsActive(): boolean;
  setIsActive(value: boolean): BotConfig;

  getCreatedAtUnixMs(): number;
  setCreatedAtUnixMs(value: number): BotConfig;

  getName(): string;
  setName(value: string): BotConfig;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BotConfig.AsObject;
  static toObject(includeInstance: boolean, msg: BotConfig): BotConfig.AsObject;
  static serializeBinaryToWriter(message: BotConfig, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BotConfig;
  static deserializeBinaryFromReader(message: BotConfig, reader: jspb.BinaryReader): BotConfig;
}

export namespace BotConfig {
  export type AsObject = {
    botId: string,
    symbol: string,
    strategy: string,
    parametersMap: Array<[string, string]>,
    isActive: boolean,
    createdAtUnixMs: number,
    name: string,
  }
}

export class CreateBotRequest extends jspb.Message {
  getSymbol(): string;
  setSymbol(value: string): CreateBotRequest;

  getStrategy(): string;
  setStrategy(value: string): CreateBotRequest;

  getParametersMap(): jspb.Map<string, string>;
  clearParametersMap(): CreateBotRequest;

  getName(): string;
  setName(value: string): CreateBotRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CreateBotRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CreateBotRequest): CreateBotRequest.AsObject;
  static serializeBinaryToWriter(message: CreateBotRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CreateBotRequest;
  static deserializeBinaryFromReader(message: CreateBotRequest, reader: jspb.BinaryReader): CreateBotRequest;
}

export namespace CreateBotRequest {
  export type AsObject = {
    symbol: string,
    strategy: string,
    parametersMap: Array<[string, string]>,
    name: string,
  }
}

export class BotIdRequest extends jspb.Message {
  getBotId(): string;
  setBotId(value: string): BotIdRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BotIdRequest.AsObject;
  static toObject(includeInstance: boolean, msg: BotIdRequest): BotIdRequest.AsObject;
  static serializeBinaryToWriter(message: BotIdRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BotIdRequest;
  static deserializeBinaryFromReader(message: BotIdRequest, reader: jspb.BinaryReader): BotIdRequest;
}

export namespace BotIdRequest {
  export type AsObject = {
    botId: string,
  }
}

export class BotList extends jspb.Message {
  getBotsList(): Array<BotConfig>;
  setBotsList(value: Array<BotConfig>): BotList;
  clearBotsList(): BotList;
  addBots(value?: BotConfig, index?: number): BotConfig;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BotList.AsObject;
  static toObject(includeInstance: boolean, msg: BotList): BotList.AsObject;
  static serializeBinaryToWriter(message: BotList, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BotList;
  static deserializeBinaryFromReader(message: BotList, reader: jspb.BinaryReader): BotList;
}

export namespace BotList {
  export type AsObject = {
    botsList: Array<BotConfig.AsObject>,
  }
}

