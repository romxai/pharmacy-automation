// src/app/stock-analysis/page.tsx

import StockAnalysisClient from "@/components/StockAnalysisClient";

export default function StockAnalysisPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          Department Stock Analysis
        </h1>
      </div>
      <StockAnalysisClient />
    </div>
  );
}
