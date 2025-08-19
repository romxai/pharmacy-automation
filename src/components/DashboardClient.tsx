// src/components/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
} from "lucide-react";

interface DashboardData {
  kpis: {
    totalStock: number;
    totalSold: number;
    lowStockCount: number;
  };
  stockByDept: { name: string; value: number }[];
  salesTrend: { name: string; value: number }[];
  stockVsSold: { name: string; stock_left: number; stock_sold: number }[];
  vendorPerformance: { name: string; value: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

const ChartCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 text-card-foreground">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <div className="h-72 w-full">{children}</div>
  </div>
);

const KpiCard = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) => (
  <div className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
    </div>
    <div className="bg-primary/10 p-3 rounded-lg">
      <Icon className="h-6 w-6 text-primary" />
    </div>
  </div>
);

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateRange.from) params.append("from", dateRange.from);
        if (dateRange.to) params.append("to", dateRange.to);

        const response = await fetch(`/api/dashboard?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 border-l-4 border-destructive text-destructive-foreground p-4 rounded-md">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">Error</p>
            <p>{error || "Failed to load dashboard data."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end gap-4">
        <input
          type="date"
          name="from"
          value={dateRange.from}
          onChange={handleDateChange}
          className="bg-card text-card-foreground p-2 rounded-md"
        />
        <input
          type="date"
          name="to"
          value={dateRange.to}
          onChange={handleDateChange}
          className="bg-card text-card-foreground p-2 rounded-md"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Total Stock"
          value={data.kpis.totalStock.toLocaleString()}
          icon={Package}
        />
        <KpiCard
          title="Total Items Sold"
          value={data.kpis.totalSold.toLocaleString()}
          icon={ShoppingCart}
        />
        <KpiCard
          title="Low Stock Items"
          value={data.kpis.lowStockCount}
          icon={TrendingDown}
        />
      </div>

      <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Stock by Department" icon={DollarSign}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data.stockByDept}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {data.stockByDept.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ color: "var(--chart-label-color)" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales Trend" icon={TrendingUp}>
          <ResponsiveContainer>
            <LineChart data={data.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--chart-label-color)" />
              <YAxis stroke="var(--chart-label-color)" />
              <Tooltip />
              <Legend wrapperStyle={{ color: "var(--chart-label-color)" }} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Stock vs. Sold (Top 10)" icon={ShoppingCart}>
          <ResponsiveContainer>
            <BarChart data={data.stockVsSold}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--chart-label-color)" />
              <YAxis stroke="var(--chart-label-color)" />
              <Tooltip />
              <Legend wrapperStyle={{ color: "var(--chart-label-color)" }} />
              <Bar
                dataKey="stock_left"
                stackId="a"
                fill="#8884d8"
                name="Stock Left"
              />
              <Bar
                dataKey="stock_sold"
                stackId="a"
                fill="#82ca9d"
                name="Stock Sold"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vendor Performance (Top 5)" icon={Users}>
          <ResponsiveContainer>
            <BarChart data={data.vendorPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--chart-label-color)" />
              <YAxis stroke="var(--chart-label-color)" />
              <Tooltip />
              <Legend wrapperStyle={{ color: "var(--chart-label-color)" }} />
              <Bar dataKey="value" fill="#FF8042" name="Total Stock" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
