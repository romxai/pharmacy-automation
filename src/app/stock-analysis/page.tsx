// src/app/stock-analysis/page.tsx

import StockAnalysisClient from "@/components/StockAnalysisClient";
import { Sidebar } from "@/components/sidebar";

export default function StockAnalysisPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 lg:ml-64">
        {" "}
        {/* Added lg:ml-64 */}
        <div className="w-full max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            Department Stock Analysis
          </h1>
          <StockAnalysisClient />
        </div>
      </main>
    </div>
  );
}
