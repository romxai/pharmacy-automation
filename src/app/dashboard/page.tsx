"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Sample data for charts
const salesData = [
  { month: "Jan", inpatient: 4000, outpatient: 2400, ot: 1800 },
  { month: "Feb", inpatient: 3000, outpatient: 1398, ot: 2000 },
  { month: "Mar", inpatient: 2000, outpatient: 9800, ot: 2200 },
  { month: "Apr", inpatient: 2780, outpatient: 3908, ot: 2500 },
  { month: "May", inpatient: 1890, outpatient: 4800, ot: 2300 },
  { month: "Jun", inpatient: 2390, outpatient: 3800, ot: 2100 },
];

const stockData = [
  { name: "Antibiotics", value: 400 },
  { name: "Painkillers", value: 300 },
  { name: "Vitamins", value: 300 },
  { name: "Cardiac", value: 200 },
  { name: "Others", value: 100 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const inventoryData = [
  { day: "Mon", value: 1200 },
  { day: "Tue", value: 1100 },
  { day: "Wed", value: 1300 },
  { day: "Thu", value: 1500 },
  { day: "Fri", value: 1000 },
  { day: "Sat", value: 900 },
  { day: "Sun", value: 800 },
];

// Dashboard stat card component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
}) {
  const isPositive = change.startsWith("+");

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight mt-1">{value}</h3>
          <p
            className={`text-xs font-medium mt-2 ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {change} from last month
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // To avoid hydration mismatch, only render charts on the client
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <div className="p-6">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Sales"
              value="₹1,45,231"
              change="+12.5%"
              icon={() => <span className="text-xl">₹</span>}
            />
            <StatCard
              title="Inventory Items"
              value="1,432"
              change="+3.2%"
              icon={() => <span className="text-xl">📦</span>}
            />
            <StatCard
              title="Low Stock Items"
              value="28"
              change="-5.1%"
              icon={() => <span className="text-xl">⚠️</span>}
            />
            <StatCard
              title="Expired Soon"
              value="15"
              change="+2.4%"
              icon={() => <span className="text-xl">🕒</span>}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Chart */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4">
                Monthly Sales by Category
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="inpatient" name="Inpatient" fill="#0088FE" />
                    <Bar
                      dataKey="outpatient"
                      name="Outpatient"
                      fill="#00C49F"
                    />
                    <Bar dataKey="ot" name="OT" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stock Distribution */}
            <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4">Stock Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {stockData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Inventory Trend */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <h3 className="text-lg font-medium mb-4">
              Weekly Inventory Value Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={inventoryData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Inventory Value (₹)"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
