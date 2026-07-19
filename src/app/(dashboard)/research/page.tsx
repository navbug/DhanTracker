import type { Metadata } from "next";
import { ResearchListClient } from "@/components/research/research-list-client";

export const metadata: Metadata = { title: "Research Boards" };

export default function ResearchPage() {
  return (
    <div className="flex flex-col h-full">
      <ResearchListClient />
    </div>
  );
}
