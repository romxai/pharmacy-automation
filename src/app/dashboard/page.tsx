// src/app/dashboard/page.tsx

import { Sidebar } from "@/components/sidebar";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 lg:ml-64">
        <div className="w-full max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            Pharmacy Dashboard
          </h1>
          <DashboardClient />
        </div>
      </main>
    </div>
  );
}
