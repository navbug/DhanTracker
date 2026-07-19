import type { Metadata } from "next";
import { HighWeightageClient } from "@/components/high-weightage/high-weightage-client";

export const metadata: Metadata = {
  title: "High Weightage Stocks",
};

export default function HighWeightagePage() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <HighWeightageClient />
    </div>
  );
}
