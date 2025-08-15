// src/app/item-master/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { utils, writeFile } from "xlsx";
import { ItemMasterEntry } from "@/types";

// A simple debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

export default function ItemMasterPage() {
  const [items, setItems] = useState<ItemMasterEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms delay
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch data when page or search query changes
  const fetchData = useCallback(async (page: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "100",
        search: search,
      });
      const res = await fetch(`/api/item-master?${params.toString()}`);
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || "Failed to fetch data");
      }
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset to page 1 whenever the search query changes, then fetch data
    setCurrentPage(1);
    fetchData(1, debouncedSearchQuery);
  }, [debouncedSearchQuery, fetchData]);

  useEffect(() => {
    // Fetch data for subsequent pages
    fetchData(currentPage, debouncedSearchQuery);
  }, [currentPage, fetchData]);

  const downloadExcel = async () => {
    setLoading(true);
    try {
      // Fetch all items that match the current search query, ignoring pagination
      const params = new URLSearchParams({
        search: debouncedSearchQuery,
        fetchAll: "true",
      });
      const res = await fetch(`/api/item-master?${params.toString()}`);
      const data = await res.json();
      const allMatchingItems = data.items;

      const exportHeaders = [
        "Item Code",
        "Item Name",
        "GRN No",
        "Invoice No",
        "GRN Date",
        "Manufacturer",
        "Vendor",
        "Free Qty",
        "Qty",
        "Units",
        "MRP",
        "Item Cost",
        "NetAmount",
        "Unit Rate",
      ];

      const dataToExport = allMatchingItems.map((item: ItemMasterEntry) => ({
        "Item Code": item["Item Code"],
        "Item Name": item["Item Name"],
        "GRN No": item["GRN No"],
        "Invoice No": item["Invoice No"],
        "GRN Date": new Date(item["GRN Date"]).toLocaleDateString("en-GB"),
        Manufacturer: item["Manufacturer"],
        Vendor: item["Vendor"],
        "Free Qty": item["Free Qty"],
        Qty: item["Qty"],
        Units: item["Units"],
        MRP: item["MRP"],
        "Item Cost": item["Item Cost"],
        NetAmount: item["NetAmount"],
        "Unit Rate": item["Unit Rate"],
      }));

      const worksheet = utils.json_to_sheet(dataToExport, {
        header: exportHeaders,
      });
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Item Master");
      writeFile(
        workbook,
        `ItemMaster_Export_${debouncedSearchQuery || "all"}.xlsx`
      );
    } catch (err) {
      setError("Failed to export data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Item Master ({totalItems})
            </h1>
            <div className="w-full sm:w-1/3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Item Name or Code..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href="/"
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                &larr; Dashboard
              </Link>
              <button
                onClick={downloadExcel}
                disabled={totalItems === 0 || loading}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Download XLS
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-center text-red-500 bg-red-50 p-4 rounded-md">
            Error: {error}
          </p>
        )}

        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Item Code",
                  "Item Name",
                  "Vendor",
                  "Manufacturer",
                  "MRP",
                  "Item Cost",
                  "Unit Rate",
                  "Latest GRN Date",
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr
                    key={item["Item Code"]}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item["Item Code"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item["Item Name"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item["Vendor"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item["Manufacturer"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item["MRP"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item["Item Cost"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item["Unit Rate"]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item["GRN Date"]).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4 px-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages || loading || totalPages === 0}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
