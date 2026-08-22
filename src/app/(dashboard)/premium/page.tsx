import type { Metadata } from "next";
import { PremiumPageClient } from "@/components/premium/premium-page-client";

export const metadata: Metadata = { title: "Premium Plan" };

export default function PremiumPage() {
  return (
    <div className="flex flex-col h-full">
      <PremiumPageClient />
    </div>
  );
}
