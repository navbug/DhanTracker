// High Weightage Stocks data — sourced from NSE
// Update this file manually when NSE rebalances indices
// Data extracted from research notes

// ─── UPDATE THIS DATE whenever weightages are manually refreshed ─────────────
export const LAST_UPDATED = "June 30, 2026";

export interface SectorIndex {
  name: string;
  slug: string;
  topStocks: { symbol: string; companyName: string; weight: number }[];
  sectorWeights?: { sector: string; weight: number }[];
}

export const HIGH_WEIGHTAGE_INDICES: SectorIndex[] = [
  {
    name: "Nifty 50",
    slug: "nifty50",
    topStocks: [
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 10.27 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 9.22 },
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 7.92 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 5.37},
      { symbol: "LT", companyName: "Larsen & Toubro Ltd.", weight: 4.13 },
    ],
    sectorWeights: [
      { sector: "Financial Services", weight: 36.18 },
      { sector: "Oil Gas & Cons. Fuel", weight: 9.65 },
      { sector: "Information Technology", weight: 8.37 },
      { sector: "Automobile & Auto Comps.", weight: 7.13 },
      { sector: "FMCG", weight: 5.37 },
    ],
  },
  {
    name: "Nifty Bank",
    slug: "nifty-bank",
    topStocks: [
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 18.20 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 14.86 },
      { symbol: "SBIN", companyName: "State Bank of India", weight: 10.09 },
      { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd.", weight: 9.32 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 8.81 },
    ],
  },
  {
    name: "Fin Nifty",
    slug: "fin-nifty",
    topStocks: [
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 18.01 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 14.70 },
      { symbol: "SBIN", companyName: "State Bank of India", weight: 9.98 },
      { symbol: "BAJFINANCE", companyName: "Bajaj Finance Ltd.", weight: 9.43 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 8.89 }
    ],
  },
  {
    name: "Nifty Private Bank",
    slug: "nifty-private-bank",
    topStocks: [
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 22.19 },
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 20.03 },
      { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd.", weight: 19.65 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 18.28 },
      { symbol: "FEDERALBNK", companyName: "Federal Bank Ltd.", weight: 6.05 },
    ],
  },
  {
    name: "Nifty PSU Banks",
    slug: "nifty-psu-banks",
    topStocks: [
      { symbol: "SBIN", companyName: "State Bank of India", weight: 33.87 },
      { symbol: "BANKBARODA", companyName: "Bank of Baroda", weight: 12.63 },
      { symbol: "CANARABANK", companyName: "Canara Bank", weight: 11.79 },
      { symbol: "PNB", companyName: "Punjab National Bank", weight: 10.89 },
      { symbol: "UNIONBANK", companyName: "Union Bank of India", weight: 10.89 },
    ],
  },
  {
    name: "Nifty IT",
    slug: "nifty-it",
    topStocks: [
      { symbol: "INFY", companyName: "Infosys Ltd.", weight: 29.23 },
      { symbol: "TCS", companyName: "Tata Consultancy Services Ltd.", weight: 20.29 },
      { symbol: "HCLTECH", companyName: "HCL Technologies Ltd.", weight: 11.93 },
      { symbol: "TECHM", companyName: "Tech Mahindra Ltd.", weight: 10.84 },
      { symbol: "PERSISTENT", companyName: "Persistent Systems Ltd.", weight: 6.23 },
    ],
  },
  {
    name: "Nifty Metal",
    slug: "nifty-metal",
    topStocks: [
      { symbol: "TATASTEEL", companyName: "Tata Steel Ltd.", weight: 19.09 },
      { symbol: "HINDALCO", companyName: "Hindalco Industries Ltd.", weight: 17.18 },
      { symbol: "JSWSTEEL", companyName: "JSW Steel Ltd.", weight: 14.51 },
      { symbol: "ADANIENT", companyName: "Adani Enterprises Ltd.", weight: 10.58 },
      { symbol: "VEDL", companyName: "Vedanta Ltd.", weight: 5.46 },
    ],
  },
  {
    name: "Nifty Auto",
    slug: "nifty-auto",
    topStocks: [
      { symbol: "M&M", companyName: "Mahindra & Mahindra Ltd.", weight: 23.68 },
      { symbol: "MARUTI", companyName: "Maruti Suzuki India Ltd.", weight: 14.49 },
      { symbol: "BAJAJ-AUTO", companyName: "Bajaj Auto Ltd.", weight: 9.96 },
      { symbol: "EICHERMOT", companyName: "Eicher Motors Ltd.", weight: 8.43 },
      { symbol: "TVSMOTOR", companyName: "TVS Motor Company Ltd.", weight: 7.91 },
    ],
  },
  {
    name: "Nifty Oil & Gas",
    slug: "nifty-oil-gas",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 32.83 },
      { symbol: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd.", weight: 15.28 },
      { symbol: "BPCL", companyName: "Bharat Petroleum Corporation Ltd.", weight: 10.51 },
      { symbol: "IOC", companyName: "Indian Oil Corporation Ltd.", weight: 8.50 },
      { symbol: "GAIL", companyName: "GAIL India Ltd.", weight: 7.94 },
    ],
  },
  {
    name: "Nifty Infra",
    slug: "nifty-infra",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 20.04 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 15.62 },
      { symbol: "LT", companyName: "Larsen & Toubro Ltd.", weight: 12.01 },
      { symbol: "NTPC", companyName: "NTPC Ltd.", weight: 4.29 },
      { symbol: "ULTRACEMCO", companyName: "UltraTech Cement Ltd.", weight: 3.63 },
    ],
  },
  {
    name: "Nifty Energy",
    slug: "nifty-energy",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 10.26 },
      { symbol: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd.", weight: 10.01 },
      { symbol: "COALINDIA", companyName: "Coal India Ltd.", weight: 9.66 },
      { symbol: "NTPC", companyName: "NTPC Ltd.", weight: 5.93 },
      { symbol: "GAIL", companyName: "GAIL India Ltd.", weight: 5.20 },
    ],
  },
  {
    name: "Nifty Consumer Durables",
    slug: "nifty-consumer-durables",
    topStocks: [
      { symbol: "TITAN", companyName: "Titan Company Ltd.", weight: 33.96 },
      { symbol: "DIXON", companyName: "Dixon Technologies (India) Ltd.", weight: 15.76 },
      { symbol: "HAVELLS", companyName: "Havells India Ltd.", weight: 8.59 },
      { symbol: "VOLTAS", companyName: "Voltas Ltd.", weight: 8.19 },
      { symbol: "KALYANKJIL", companyName: "Kalyan Jewellers India Ltd.", weight: 6.36 },
    ],
  },
  {
    name: "Nifty FMCG",
    slug: "nifty-fmcg",
    topStocks: [
      { symbol: "ITC", companyName: "ITC Ltd.", weight: 26.80 },
      { symbol: "HINDUNILVR", companyName: "Hindustan Unilever Ltd.", weight: 18.44 },
      { symbol: "NESTLEIND", companyName: "Nestle India Ltd.", weight: 10.71 },
      { symbol: "TATACONSUM", companyName: "Tata Consumer Products Ltd.", weight: 6.98 },
      { symbol: "BRITANNIA", companyName: "Britannia Industries Ltd.", weight: 6.31 },
    ],
  },
  {
    name: "Nifty Realty",
    slug: "nifty-realty",
    topStocks: [
      { symbol: "DLF", companyName: "DLF Ltd.", weight: 18.95 },
      { symbol: "PHOENIXLTD", companyName: "Phoenix Mills Ltd.", weight: 15.83 },
      { symbol: "LODHA", companyName: "Lodha Developers Ltd.", weight: 15.46 },
      { symbol: "GODREJPROP", companyName: "Godrej Properties Ltd.", weight: 12.76 },
      { symbol: "PRESTIGE", companyName: "Prestige Estates Projects Ltd.", weight: 12.21 },
    ],
  },
  {
    name: "Nifty Media",
    slug: "nifty-media",
    topStocks: [
      { symbol: "ZEEL", companyName: "Zee Entertainment Enterprises Ltd.", weight: 24.21 },
      { symbol: "PVRINOX", companyName: "PVR INOX Ltd.", weight: 18.57 },
      { symbol: "NAZARA", companyName: "Nazara Technologies Ltd.", weight: 17.76 },
      { symbol: "SUNTV", companyName: "Sun TV Network Ltd.", weight: 11.57 },
      { symbol: "SAREGAMA", companyName: "Saregama India Ltd.", weight: 8.70 },
    ],
  },
  {
    name: "Nifty Pharma",
    slug: "nifty-pharma",
    topStocks: [
      { symbol: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Ltd.", weight: 21.34 },
      { symbol: "DIVISLAB", companyName: "Divi's Laboratories Ltd.", weight: 10.36 },
      { symbol: "CIPLA", companyName: "Cipla Ltd.", weight: 8.39 },
      { symbol: "TORNTPHARM", companyName: "Torrent Pharmaceuticals Ltd.", weight: 7.61 },
      { symbol: "LAURUSLABS", companyName: "Laurus Labs Ltd.", weight: 7.15 },
    ],
  },
  {
    name: "Nifty Defence",
    slug: "nifty-defence",
    topStocks: [
      { symbol: "HAL", companyName: "Hindustan Aeronautics Ltd.", weight: 21.56 },
      { symbol: "BEL", companyName: "Bharat Electronics Ltd.", weight: 19.01 },
      { symbol: "BHARATFORG", companyName: "Bharat Forge Ltd.", weight: 15.15 },
      { symbol: "SOLARA", companyName: "Solar Industries India Ltd.", weight: 11.57 },
      { symbol: "MAZDOCK", companyName: "Mazagon Dock Shipbuilders Ltd.", weight: 4.67 },
    ],
  },
];