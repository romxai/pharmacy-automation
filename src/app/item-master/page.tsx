"use client";

import { useState, useEffect, useCallback } from "react";
import { utils, writeFile } from "xlsx";
import { ItemMasterEntry } from "@/types";
import { Sidebar } from "@/components/sidebar";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Download, Upload, Database } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  // Upload progress state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

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

  const handleFileUpload = async (file: File) => {
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessedRecords(0);
    setTotalRecords(0);
    setIsProcessing(false);
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // First simulate upload progress
      for (let i = 0; i <= 100; i += 5) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setUploadProgress(i);
      }

      setIsProcessing(true);
      setUploadMessage("File uploaded. Processing data...");

      // Now make the actual API call
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.message || "Upload failed");
      }

      const result = await res.json();
      const recordCount = result.recordCount || 100; // Fallback if not provided
      setTotalRecords(recordCount);

      // Simulate processing progress
      for (let i = 0; i <= recordCount; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        setProcessedRecords(i);
        setProcessingProgress(Math.floor((i / recordCount) * 100));
      }

      setUploadMessage(result.message || "Upload completed successfully");

      // Refresh data after successful upload
      fetchData(currentPage, debouncedSearchQuery);

      // Close dialog after a delay
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploadMessage("Upload failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-screen-xl mx-auto">
            {/* Header */}
            <div className="bg-card rounded-lg border border-border shadow-sm p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">
                  Item Master{" "}
                  <span className="text-muted-foreground">({totalItems})</span>
                </h1>

                {/* Search */}
                <div className="w-full sm:w-1/3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Item Name or Code..."
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-3">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload GRN
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload GRN File</DialogTitle>
                        <DialogDescription>
                          Upload an Excel file (.xlsx, .xls) containing GRN data
                          to update the item master.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        {isProcessing ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Processing records</span>
                                <span>
                                  {processedRecords}/{totalRecords}
                                </span>
                              </div>
                              <Progress value={processingProgress} />
                            </div>
                            <p className="text-sm text-center text-muted-foreground">
                              {uploadMessage}
                            </p>
                          </div>
                        ) : (
                          <FileUpload
                            onUpload={handleFileUpload}
                            accept=".xlsx, .xls"
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={downloadExcel}
                    disabled={totalItems === 0 || loading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 rounded-md text-destructive">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!loading && items.length === 0 && (
              <div className="bg-card rounded-lg border border-border shadow-sm p-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Database className="h-10 w-10 text-primary" />
                </div>
                <h2 className="mt-6 text-xl font-semibold">No items found</h2>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term or"
                    : "Get started by uploading your first GRN file."}
                </p>
                <div className="mt-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload GRN File
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload GRN File</DialogTitle>
                        <DialogDescription>
                          Upload an Excel file (.xlsx, .xls) containing GRN data
                          to update the item master.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <FileUpload
                          onUpload={handleFileUpload}
                          accept=".xlsx, .xls"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {/* Table */}
            {items.length > 0 && (
              <div className="overflow-x-auto bg-card rounded-lg border border-border shadow-sm">
                <table className="min-w-full divide-y divide-border">
                  <thead>
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
                          className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-10 text-muted-foreground"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item["Item Code"]}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {item["Item Code"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item["Item Name"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {item["Vendor"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {item["Manufacturer"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item["MRP"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item["Item Cost"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item["Unit Rate"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(item["GRN Date"]).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {items.length > 0 && (
              <div className="flex justify-between items-center mt-4 px-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={
                    currentPage === totalPages || loading || totalPages === 0
                  }
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
