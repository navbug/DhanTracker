// ─── STOCK / PRICE TYPES ─────────────────────────────────────────────────────

export interface StockPrice {
  symbol: string;
  companyName?: string;
  sector?: string;
  lastPrice: number;
  change: number;
  pChange: number; // percentage change
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  totalTradedVolume: number;
  marketCap?: number; // lastPrice * issuedSize (in Cr.)
  yearHigh: number;
  yearLow: number;
  issuedSize?: number;
}

export interface StockMeta {
  symbol: string;
  companyName: string;
  sector?: string;
  industry?: string;
  isin?: string;
}

// Combined stock data (metadata + price)
export interface WatchlistStockData extends StockMeta {
  price?: StockPrice;
  note?: string;
  position?: number;
  watchlistStockId?: string; // DB id for custom watchlist stocks
}

// ─── STATIC INDEX TYPES ──────────────────────────────────────────────────────

export interface IndexStock {
  symbol: string;
  companyName: string;
  sector?: string;
  marketCap?: number; // in Cr. from CSV, updated from live prices
}

export interface NiftyIndex {
  name: string;
  slug: string;
  stocks: IndexStock[];
}

// ─── WATCHLIST TYPES ─────────────────────────────────────────────────────────

export type WatchlistType = "predefined" | "custom";

export interface PredefinedWatchlistMeta {
  type: "predefined";
  id: string; // e.g. "nifty50", "nifty100"
  name: string; // e.g. "Nifty 50"
  slug: string;
  stockCount: number;
}

export interface CustomWatchlistMeta {
  type: "custom";
  id: string; // DB cuid
  name: string;
  stockCount: number;
  createdAt: string;
}

export type WatchlistMeta = PredefinedWatchlistMeta | CustomWatchlistMeta;

export interface WatchlistWithStocks {
  id: string;
  name: string;
  type: WatchlistType;
  stocks: WatchlistStockData[];
}

// ─── TRADE TYPES ─────────────────────────────────────────────────────────────

export type TradeSetup =
  | "QUICK_TRADE"
  | "HIT"
  | "DIT"
  | "WIT"
  | "MIT"
  | "QIT"
  | "HYIT"
  | "YIT";

export type TradePriority = "MUST_TRADE" | "HIGH" | "MEDIUM" | "LOW";

export type TradeOutcome =
  | "OPEN"
  | "TARGET_HIT"
  | "SL_HIT"
  | "PARTIAL_PROFIT";

export interface Trade {
  id: string;
  userId: string;
  date: string;
  stock: string;
  tradeSetup: TradeSetup;
  priority: TradePriority;
  entry: number;
  sl: number;
  target: number;
  qty: number;
  outcome: TradeOutcome;
  timeTaken?: string;
  remark?: string;
  screenshots: string[];
  pnl?: number;
  exitPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeFormValues {
  date: Date;
  stock: string;
  tradeSetup: TradeSetup;
  priority: TradePriority;
  entry: number;
  sl: number;
  target: number;
  qty: number;
  outcome: TradeOutcome;
  timeTaken?: string;
  remark?: string;
  exitPrice?: number;
}

// ─── ANALYTICS / DASHBOARD TYPES ─────────────────────────────────────────────

export interface TradeAnalytics {
  totalTrades: number;
  openTrades: number;
  wonTrades: number;
  lostTrades: number;
  overallAccuracy: number;
  netPnl: number;
  bestTrade: number;
  worstTrade: number;
  accuracyBySetup: Record<TradeSetup, { total: number; won: number; accuracy: number | null }>;
}

// ─── RESEARCH TYPES ──────────────────────────────────────────────────────────

export type ResearchCategory = "MARKET" | "SECTOR" | "STOCK" | "PERSONAL";

export interface Research {
  id: string;
  userId: string;
  title: string;
  category: ResearchCategory;
  description?: string;
  canvas?: unknown; // tldraw TLStoreSnapshot
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFormValues {
  title: string;
  category: ResearchCategory;
  description?: string;
}

// ─── API RESPONSE TYPES ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── UI / STORE TYPES ────────────────────────────────────────────────────────

export interface SidebarState {
  isOpen: boolean;
  activeWatchlistId: string | null;
}

export type MarketStatus = "open" | "closed" | "pre-open" | "unknown";

// ─── DISPLAY HELPERS ─────────────────────────────────────────────────────────

export const TRADE_SETUP_LABELS: Record<TradeSetup, string> = {
  QUICK_TRADE: "Quick Trade",
  HIT: "HIT",
  DIT: "DIT",
  WIT: "WIT",
  MIT: "MIT",
  QIT: "QIT",
  HYIT: "HYIT",
  HVIT: "HYIT", // DB enum value, display as HYIT
  YIT: "YIT",
};

export const TRADE_SETUP_DESCRIPTIONS: Record<TradeSetup, string> = {
  QUICK_TRADE: "Intraday / Quick",
  HIT: "Hourly Income Trade",
  DIT: "Daily Income Trade",
  WIT: "Weekly Income Trade",
  MIT: "Monthly Income Trade",
  QIT: "Quarterly Income Trade",
  HYIT: "Half Yearly Income Trade",
  HVIT: "Half Yearly Income Trade", // DB alias
  YIT: "Yearly Income Trade",
};

export const TRADE_PRIORITY_LABELS: Record<TradePriority, string> = {
  MUST_TRADE: "Must Trade",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const TRADE_OUTCOME_LABELS: Record<TradeOutcome, string> = {
  OPEN: "Open",
  TARGET_HIT: "Target Hit",
  SL_HIT: "SL Hit",
  PARTIAL_PROFIT: "Partial Profit",
};

export const PREDEFINED_WATCHLISTS: PredefinedWatchlistMeta[] = [
  { type: "predefined", id: "nifty50", name: "Nifty 50", slug: "nifty50", stockCount: 50 },
  { type: "predefined", id: "nifty100", name: "Nifty 100", slug: "nifty100", stockCount: 100 },
  { type: "predefined", id: "nifty-midcap150", name: "Nifty Midcap 150", slug: "nifty-midcap150", stockCount: 150 },
  { type: "predefined", id: "nifty-smallcap250", name: "Nifty Smallcap 250", slug: "nifty-smallcap250", stockCount: 250 },
  { type: "predefined", id: "nifty500", name: "Nifty 500", slug: "nifty500", stockCount: 500 },
];

export const RESEARCH_CATEGORY_LABELS: Record<ResearchCategory, string> = {
  MARKET: "Market",
  SECTOR: "Sector",
  STOCK: "Stock",
  PERSONAL: "Personal",
};