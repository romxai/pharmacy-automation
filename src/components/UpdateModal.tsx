// src/components/UpdateModal.tsx

import { useState, FormEvent, useRef } from "react";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function UpdateModal({
  isOpen,
  onClose,
  department,
  onSuccess,
  onError,
}: UpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [updateType, setUpdateType] = useState("full");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(formRef.current!);
    formData.append("department", department);
    formData.append(
      "updateType",
      department === "All Departments" ? updateType : "single"
    );

    try {
      const response = await fetch("/api/stock-analysis", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "An unknown error occurred.");
      }

      onSuccess();
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const renderFileInput = (id: string, label: string) => (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-600 dark:text-gray-400"
      >
        {label}
      </label>
      <input
        type="file"
        id={id}
        name={id}
        required
        accept=".xlsx,.xls"
        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">
          Update Stock for {department}
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {department === "All Departments" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Update Type
              </label>
              <select
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value)}
                className="block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
              >
                <option value="full">Full Update</option>
                <option value="transfer">Transfer Record Update</option>
              </select>
            </div>
          )}

          {department !== "All Departments" && (
            <>
              {renderFileInput("stock_balance_file", "Stock Balance Sheet")}
              {renderFileInput("sales_report_file", "Department Sales Sheet")}
            </>
          )}

          {department === "All Departments" && updateType === "full" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">IP Department</h3>
                {renderFileInput(
                  "ip_stock_balance_file",
                  "Stock Balance Sheet"
                )}
                {renderFileInput("ip_sales_report_file", "Sales Report")}
              </div>
              <div>
                <h3 className="font-semibold mb-2">OP Department</h3>
                {renderFileInput(
                  "op_stock_balance_file",
                  "Stock Balance Sheet"
                )}
                {renderFileInput("op_sales_report_file", "Sales Report")}
              </div>
              <div>
                <h3 className="font-semibold mb-2">OT Department</h3>
                {renderFileInput(
                  "ot_stock_balance_file",
                  "Stock Balance Sheet"
                )}
                {renderFileInput("ot_sales_report_file", "Sales Report")}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Transfer</h3>
                {renderFileInput("stock_transfer_file", "Stock Transfer Sheet")}
              </div>
            </div>
          )}

          {department === "All Departments" &&
            updateType === "transfer" &&
            renderFileInput("stock_transfer_file", "Stock Transfer Sheet")}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isLoading ? "Processing..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
