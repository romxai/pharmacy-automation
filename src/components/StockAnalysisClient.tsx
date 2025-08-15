// src/components/StockAnalysisClient.tsx
"use client";

import { useState, FormEvent } from "react";

interface StockResult {
  _id: string;
  item: { itemCode: string; itemName: string };
  initial_stock: number;
  stock_sold: number;
  stock_transferred: number;
  stock_used: number;
  stock_left: number;
}

export default function StockAnalysisClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null); // Added details field
  const [results, setResults] = useState<StockResult[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [asOfDate, setAsOfDate] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setResults([]);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedDept = formData.get("department") as string;

    try {
      const response = await fetch("/api/stock-analysis", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Now we expect a more detailed error message
        throw new Error(
          data.error || "An unknown error occurred during processing."
        );
      }

      setMessage({ type: "success", text: data.message });
      setDepartmentName(selectedDept);
      setAsOfDate(data.asOfDate);
      fetchResults(selectedDept, data.asOfDate);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Processing Failed!",
        details: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async (department: string, date: string) => {
    try {
      const response = await fetch(
        `/api/stock-analysis?department=${department}&date=${date}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch results.");
      }
      const data: StockResult[] = await response.json();
      setResults(data);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Could not fetch results",
        details: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit}>
          {/* Form Content is unchanged */}
          <div className="mb-6">
            <label
              htmlFor="department"
              className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2"
            >
              1. Select Department to Process
            </label>
            <select
              id="department"
              name="department"
              required
              className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="IP">IP</option>
              <option value="OP">OP</option>
              <option value="OT">OT</option>
            </select>
          </div>
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              2. Upload Required Files
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  htmlFor="stock_balance_file"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  Stock Balance Sheet
                </label>
                <input
                  type="file"
                  id="stock_balance_file"
                  name="stock_balance_file"
                  required
                  accept=".xlsx,.xls"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
                />
              </div>
              <div>
                <label
                  htmlFor="sales_report_file"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  Sales Report
                </label>
                <input
                  type="file"
                  id="sales_report_file"
                  name="sales_report_file"
                  required
                  accept=".xlsx,.xls"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
                />
              </div>
              <div>
                <label
                  htmlFor="stock_transfer_file"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-400"
                >
                  Stock Transfer Sheet
                </label>
                <input
                  type="file"
                  id="stock_transfer_file"
                  name="stock_transfer_file"
                  required
                  accept=".xlsx,.xls"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Process and Display Results"}
          </button>
        </form>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
          }`}
        >
          <p className="font-bold text-sm">{message.text}</p>
          {message.details && <p className="text-xs mt-1">{message.details}</p>}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">
              Analysis Results for {departmentName}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({new Date(asOfDate + "T12:00:00.000Z").toLocaleDateString()})
              </span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Item Code
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Item Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Initial Stock
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Sold
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Transferred Out
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Total Used
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Stock Left
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((row) => (
                  <tr key={row._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.item.itemCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.item.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.initial_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.stock_sold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.stock_transferred}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {row.stock_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {row.stock_left}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
