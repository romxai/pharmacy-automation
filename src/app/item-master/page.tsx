// src/app/item-master/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { utils, writeFile } from "xlsx";
import { ItemMasterEntry } from "@/types";

export default function ItemMasterPage() {
  const [items, setItems] = useState<ItemMasterEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/item-master");
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.message || "Failed to fetch data");
        }
        const data: ItemMasterEntry[] = await res.json();
        setItems(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) {
      return items;
    }
    return items.filter((item) => {
      const name = item["Item Name"]?.toLowerCase() || "";
      const code = item["Item Code"]?.toLowerCase() || "";
      const query = searchQuery.toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [items, searchQuery]);

  const downloadExcel = () => {
    // 1. Define the exact order and headers for the export
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

    // 2. Map the filtered data to the desired format
    const dataToExport = filteredItems.map((item) => ({
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

    // 3. Create the worksheet and workbook
    const worksheet = utils.json_to_sheet(dataToExport, {
      header: exportHeaders,
    });
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Item Master");

    // 4. Trigger the download
    writeFile(workbook, "ItemMaster_Export.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Item Master ({filteredItems.length})
            </h1>

            {/* Search Input */}
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
                disabled={filteredItems.length === 0}
                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                Download as XLS
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <p className="text-center text-gray-600">Loading item data...</p>
        )}
        {error && (
          <p className="text-center text-red-500 bg-red-50 p-4 rounded-md">
            Error: {error}
          </p>
        )}

        {!loading && !error && (
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
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
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
        )}
      </div>
    </div>
  );
}
