// src/components/ReorderAnalysisClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ReorderResult {
  _id: string;
  itemId: string;
  item: {
    itemCode: string;
    itemName: string;
    manufacturer: string; // <-- ADDED
    vendor: string; // <-- ADDED
  };
  initial_stock: number;
  stock_sold: number;
  stock_transferred: number;
  stock_used: number;
  stock_left: number;
  reorder_quantity: number;
}

export default function ReorderAnalysisClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);
  const [results, setResults] = useState<ReorderResult[]>([]);
  const [allSavedResults, setAllSavedResults] = useState<ReorderResult[]>([]);
  const [surplusPercentage, setSurplusPercentage] = useState(0.1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCalculated, setIsCalculated] = useState(false);

  const recordsPerPage = 30;

  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/reorder-analysis/save");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setSurplusPercentage(data.surplusPercentage);
            const formattedResults = data.items.map((item: any) => ({
              ...item,
              _id: item.itemId,
              item: {
                itemCode: item.itemCode,
                itemName: item.itemName,
                manufacturer: item.manufacturer, // <-- ADDED
                vendor: item.vendor, // <-- ADDED
              },
            }));
            setAllSavedResults(formattedResults);
            setTotalPages(Math.ceil(formattedResults.length / recordsPerPage));
            setResults(formattedResults.slice(0, recordsPerPage));
            setIsCalculated(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch latest analysis", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestAnalysis();
  }, []);

  const handleFetchReorderData = async (page = 1) => {
    setIsLoading(true);
    setMessage(null);
    setCurrentPage(page);
    try {
      const response = await fetch(
        `/api/reorder-analysis?page=${page}&limit=${recordsPerPage}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch reorder data.");
      }
      const data = await response.json();
      const calculatedResults = data.results.map((item: any) => ({
        ...item,
        itemId: item._id,
        reorder_quantity: Math.ceil(
          item.stock_used * (1 + surplusPercentage) - item.stock_left
        ),
      }));
      setResults(calculatedResults);
      setTotalPages(data.totalPages);
      setIsCalculated(true);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Could not fetch reorder data",
        details: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const allDataResponse = await fetch(
        `/api/reorder-analysis?page=1&limit=10000`
      ); // Fetch all
      const allData = await allDataResponse.json();
      const allCalculatedResults = allData.results.map((item: any) => ({
        ...item,
        itemId: item._id,
        reorder_quantity: Math.ceil(
          item.stock_used * (1 + surplusPercentage) - item.stock_left
        ),
      }));

      const response = await fetch("/api/reorder-analysis/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surplusPercentage,
          items: allCalculatedResults.map(
            ({ item, stock_left, stock_used, reorder_quantity, itemId }: any) => ({
              itemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              manufacturer: item.manufacturer, // <-- ADDED
              vendor: item.vendor, // <-- ADDED
              stock_left,
              stock_used,
              reorder_quantity,
            })
          ),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save reorder data.");
      }

      setMessage({
        type: "success",
        text: "Reorder analysis saved successfully!",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: "Could not save reorder data",
        details: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      if (isCalculated) {
        handleFetchReorderData(newPage);
      } else {
        const start = (newPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        setResults(allSavedResults.slice(start, end));
        setCurrentPage(newPage);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label
              htmlFor="surplus-modifier"
              className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2"
            >
              Surplus Percentage
            </label>
            <div className="flex items-center space-x-4">
              <Slider
                id="surplus-modifier"
                min={0}
                max={1}
                step={0.01}
                value={[surplusPercentage]}
                onValueChange={(value) => setSurplusPercentage(value[0])}
                className="w-full"
              />
              <Input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={surplusPercentage}
                onChange={(e) =>
                  setSurplusPercentage(parseFloat(e.target.value))
                }
                className="w-24"
              />
            </div>
          </div>
          <div className="md:col-start-3 md:justify-self-end flex space-x-2">
            <Button
              onClick={() => handleFetchReorderData(1)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Calculate"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isCalculated}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
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
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    To Order
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
                      {row.item.manufacturer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.item.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.stock_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.stock_left}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {row.reorder_quantity}
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
        <p>No items to reorder.</p>
      )}
    </div>
  );
}
