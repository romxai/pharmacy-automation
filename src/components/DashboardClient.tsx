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
} from "recharts";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";

interface DashboardData {
  kpis: {
    totalStock: number;
    totalSold: number;
    lowStockCount: number;
  };
  stockByDept: { name: string; value: number }[];
  topSoldItems: { name: string; value: number }[];
  topStockedItems: { name: string; value: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
    <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard");
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center">
        <AlertTriangle className="mr-2" />
        <p>Could not load dashboard data. Please try again later.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg">
          <p className="font-bold">{label}</p>
          <p className="text-sm text-primary">{`Quantity: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Total Stock Left"
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 10 Most Sold Items">
          <ResponsiveContainer>
            <BarChart
              data={data.topSoldItems}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tick={{ width: 150 }}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--accent))" }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Most Stocked Items">
          <ResponsiveContainer>
            <BarChart
              data={data.topStockedItems}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tick={{ width: 150 }}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--accent))" }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock Distribution by Department">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data.stockByDept}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.stockByDept.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
