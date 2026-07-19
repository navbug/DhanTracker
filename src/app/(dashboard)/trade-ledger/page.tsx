import type { Metadata } from "next";
import { TradeLedgerClient } from "@/components/trade-ledger/trade-ledger-client";

export const metadata: Metadata = { title: "Trade Ledger" };

export default function TradeLedgerPage() {
  return (
    <div className="flex flex-col h-full">
      <TradeLedgerClient />
    </div>
  );
}
