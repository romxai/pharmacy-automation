// src/components/StockAnalysisClient.tsx
"use client";

import { useState, useEffect } from "react";
import { UpdateModal } from "@/components/UpdateModal";
import { format } from "date-fns";
import { Button } from "./ui/button";

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
  } | null>(null);
  const [results, setResults] = useState<StockResult[]>([]);
  const [departmentName, setDepartmentName] = useState("All Departments");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchResults(departmentName, currentPage);
  }, [departmentName, currentPage]);

  const fetchResults = async (department: string, page: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/stock-analysis?department=${department}&page=${page}&limit=30` // <--- UPDATED
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch results.");
      }
      const data = await response.json();
      setResults(data.results);
      setTotalPages(data.totalPages);
      setLastUpdated(data.lastUpdated);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Could not fetch results",
        details: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = () => {
    setIsModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label
              htmlFor="department"
              className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2"
            >
              Select Department
            </label>
            <select
              id="department"
              name="department"
              value={departmentName}
              onChange={(e) => {
                setDepartmentName(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="All Departments">All Departments</option>
              <option value="IP">IP</option>
              <option value="OP">OP</option>
              <option value="OT">OT</option>
            </select>
          </div>
          <div className="text-right">
            <Button onClick={handleUpdate}>Update</Button>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {format(new Date(lastUpdated), "PPpp")}
              </p>
            )}
          </div>
        </div>
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

      {isLoading ? (
        <p>Loading...</p>
      ) : results.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Initial Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Transferred Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
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
          <div className="flex justify-between items-center p-4">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p>No results found for the selected department.</p>
      )}

      <UpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        department={departmentName}
        onSuccess={() => {
          fetchResults(departmentName, 1);
          setMessage({ type: "success", text: "Stock updated successfully!" });
        }}
        onError={(error) => {
          setMessage({
            type: "error",
            text: "Failed to update stock",
            details: error,
          });
        }}
      />
    </div>
  );
}
