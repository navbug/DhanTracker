import type { Metadata } from "next";
import { TradeSetupsClient } from "@/components/trade-setups/trade-setups-client";

export const metadata: Metadata = { title: "Trade Setups" };

export default function TradeSetupsPage() {
  return (
    <div className="flex flex-col h-full">
      <TradeSetupsClient />
    </div>
  );
}
