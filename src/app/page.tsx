// src/app/page.tsx
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage("");
      setError("");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setMessage("Processing file... Please wait.");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "An unknown error occurred.");
      }

      setMessage(result.message);
      setFile(null); // Clear file input on success
      // Reset the form to allow uploading the same file again
      const form = e.target as HTMLFormElement;
      form.reset();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message);
      setMessage("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-2">
          Pharmacy Inventory System
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Update the central item master by uploading a GRN sheet.
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* File Upload Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Upload GRN File
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="file-upload"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Select GRN Excel File (.xlsx, .xls)
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
              >
                {isUploading ? "Processing..." : "Upload & Update Database"}
              </button>
            </form>
            {message && (
              <p className="mt-4 text-sm text-center text-green-600 bg-green-50 p-3 rounded-md">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-4 text-sm text-center text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </p>
            )}
          </div>

          {/* Navigation Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              View Database
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Access the complete and up-to-date item master.
            </p>
            <Link
              href="/item-master"
              className="w-full text-center bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300"
            >
              Go to Item Master
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
