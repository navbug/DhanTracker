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
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 13.19 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 8.91 },
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 8.79 },
      { symbol: "INFY", companyName: "Infosys Ltd.", weight: 4.99 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 4.74 },
    ],
    sectorWeights: [
      { sector: "Financial Services", weight: 37.41 },
      { sector: "Information Technology", weight: 11.21 },
      { sector: "Oil Gas & Cons. Fuel", weight: 10.38 },
      { sector: "Automobile & Auto Comps.", weight: 7.03 },
      { sector: "FMCG", weight: 6.50 },
    ],
  },
  {
    name: "Nifty Bank",
    slug: "nifty-bank",
    topStocks: [
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 28.17 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 25.23 },
      { symbol: "SBIN", companyName: "State Bank of India", weight: 8.72 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 8.40 },
      { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd.", weight: 8.36 },
    ],
  },
  {
    name: "Nifty Private Bank",
    slug: "nifty-private-bank",
    topStocks: [
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 21.48 },
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 21.41 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 19.13 },
      { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd.", weight: 19.04 },
    ],
  },
  {
    name: "Nifty PSU Banks",
    slug: "nifty-psu-banks",
    topStocks: [
      { symbol: "SBIN", companyName: "State Bank of India", weight: 32.66 },
      { symbol: "BANKBARODA", companyName: "Bank of Baroda", weight: 14.67 },
      { symbol: "CANARABANK", companyName: "Canara Bank", weight: 12.26 },
      { symbol: "PNB", companyName: "Punjab National Bank", weight: 12.13 },
    ],
  },
  {
    name: "Nifty IT",
    slug: "nifty-it",
    topStocks: [
      { symbol: "INFY", companyName: "Infosys Ltd.", weight: 28.80 },
      { symbol: "TCS", companyName: "Tata Consultancy Services Ltd.", weight: 21.93 },
      { symbol: "HCLTECH", companyName: "HCL Technologies Ltd.", weight: 11.36 },
      { symbol: "TECHM", companyName: "Tech Mahindra Ltd.", weight: 9.78 },
    ],
  },
  {
    name: "Nifty Metal",
    slug: "nifty-metal",
    topStocks: [
      { symbol: "TATASTEEL", companyName: "Tata Steel Ltd.", weight: 19.32 },
      { symbol: "HINDALCO", companyName: "Hindalco Industries Ltd.", weight: 14.67 },
      { symbol: "JSWSTEEL", companyName: "JSW Steel Ltd.", weight: 14.16 },
      { symbol: "VEDL", companyName: "Vedanta Ltd.", weight: 11.43 },
    ],
  },
  {
    name: "Nifty Auto",
    slug: "nifty-auto",
    topStocks: [
      { symbol: "M&M", companyName: "Mahindra & Mahindra Ltd.", weight: 24.98 },
      { symbol: "MARUTI", companyName: "Maruti Suzuki India Ltd.", weight: 14.46 },
      { symbol: "TATAMOTORS", companyName: "Tata Motors Ltd.", weight: 12.76 },
      { symbol: "BAJAJ-AUTO", companyName: "Bajaj Auto Ltd.", weight: 8.24 },
    ],
  },
  {
    name: "Nifty Oil & Gas",
    slug: "nifty-oil-gas",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 32.84 },
      { symbol: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd.", weight: 14.61 },
      { symbol: "BPCL", companyName: "Bharat Petroleum Corporation Ltd.", weight: 9.91 },
      { symbol: "IOC", companyName: "Indian Oil Corporation Ltd.", weight: 8.46 },
      { symbol: "GAIL", companyName: "GAIL India Ltd.", weight: 7.93 },
    ],
  },
  {
    name: "Nifty Infra",
    slug: "nifty-infra",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 20.01 },
      { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", weight: 15.37 },
      { symbol: "LT", companyName: "Larsen & Toubro Ltd.", weight: 12.09 },
      { symbol: "NTPC", companyName: "NTPC Ltd.", weight: 4.46 },
      { symbol: "ULTRACEMCO", companyName: "UltraTech Cement Ltd.", weight: 4.03 },
    ],
  },
  {
    name: "Nifty Energy",
    slug: "nifty-energy",
    topStocks: [
      { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", weight: 10.04 },
      { symbol: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd.", weight: 9.44 },
      { symbol: "COALINDIA", companyName: "Coal India Ltd.", weight: 8.86 },
      { symbol: "SUZLON", companyName: "Suzlon Energy Ltd.", weight: 6.59 },
      { symbol: "NTPC", companyName: "NTPC Ltd.", weight: 6.53 },
    ],
  },
  {
    name: "Nifty Consumer Durables",
    slug: "nifty-consumer-durables",
    topStocks: [
      { symbol: "TITAN", companyName: "Titan Company Ltd.", weight: 32.95 },
      { symbol: "DIXON", companyName: "Dixon Technologies (India) Ltd.", weight: 15.13 },
      { symbol: "HAVELLS", companyName: "Havells India Ltd.", weight: 10.15 },
      { symbol: "VOLTAS", companyName: "Voltas Ltd.", weight: 7.76 },
      { symbol: "CROMPTON", companyName: "Crompton Greaves Consumer Electricals Ltd.", weight: 5.92 },
    ],
  },
  {
    name: "Nifty FMCG",
    slug: "nifty-fmcg",
    topStocks: [
      { symbol: "ITC", companyName: "ITC Ltd.", weight: 32.92 },
      { symbol: "HINDUNILVR", companyName: "Hindustan Unilever Ltd.", weight: 18.31 },
      { symbol: "NESTLEIND", companyName: "Nestle India Ltd.", weight: 7.95 },
      { symbol: "TATACONSUM", companyName: "Tata Consumer Products Ltd.", weight: 6.43 },
      { symbol: "BRITANNIA", companyName: "Britannia Industries Ltd.", weight: 6.20 },
    ],
  },
  {
    name: "Nifty Realty",
    slug: "nifty-realty",
    topStocks: [
      { symbol: "DLF", companyName: "DLF Ltd.", weight: 22.14 },
      { symbol: "MACROTECH", companyName: "Macrotech Developers Ltd.", weight: 15.97 },
      { symbol: "GODREJPROP", companyName: "Godrej Properties Ltd.", weight: 14.51 },
      { symbol: "PHOENIXLTD", companyName: "Phoenix Mills Ltd.", weight: 12.00 },
      { symbol: "PRESTIGE", companyName: "Prestige Estates Projects Ltd.", weight: 11.52 },
    ],
  },
  {
    name: "Nifty Media",
    slug: "nifty-media",
    topStocks: [
      { symbol: "ZEEL", companyName: "Zee Entertainment Enterprises Ltd.", weight: 29.88 },
      { symbol: "PVRINOX", companyName: "PVR INOX Ltd.", weight: 15.32 },
      { symbol: "SUNTV", companyName: "Sun TV Network Ltd.", weight: 13.08 },
      { symbol: "NAZARA", companyName: "Nazara Technologies Ltd.", weight: 12.01 },
      { symbol: "NETWORK18", companyName: "Network18 Media & Investments Ltd.", weight: 8.52 },
    ],
  },
  {
    name: "Nifty Pharma",
    slug: "nifty-pharma",
    topStocks: [
      { symbol: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Ltd.", weight: 22.86 },
      { symbol: "DIVISLAB", companyName: "Divi's Laboratories Ltd.", weight: 10.94 },
      { symbol: "CIPLA", companyName: "Cipla Ltd.", weight: 10.72 },
      { symbol: "DRREDDY", companyName: "Dr. Reddy's Laboratories Ltd.", weight: 9.89 },
    ],
  },
  {
    name: "Nifty Defence",
    slug: "nifty-defence",
    topStocks: [
      { symbol: "HAL", companyName: "Hindustan Aeronautics Ltd.", weight: 26.12 },
      { symbol: "BEL", companyName: "Bharat Electronics Ltd.", weight: 21.06 },
      { symbol: "SOLARA", companyName: "Solar Industries India Ltd.", weight: 14.61 },
      { symbol: "MAZDOCK", companyName: "Mazagon Dock Shipbuilders Ltd.", weight: 8.88 },
    ],
  },
  {
    name: "Fin Nifty",
    slug: "fin-nifty",
    topStocks: [
      { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", weight: 32.54 },
      { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", weight: 21.97 },
      { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", weight: 7.32 },
      { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Ltd.", weight: 6.93 },
      { symbol: "SBIN", companyName: "State Bank of India", weight: 6.86 },
    ],
  },
];