"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  onUpload,
  accept = ".xlsx, .xls",
  maxSize = 20, // Default 10MB
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Check file type
    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (
      !fileType ||
      !(accept.includes(fileType) || accept.includes(`.${fileType}`))
    ) {
      setError(`Invalid file type. Please upload ${accept} files.`);
      return;
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds the limit of ${maxSize}MB.`);
      return;
    }

    setFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 99 : newProgress; // Cap at 99% until complete
        });
      }, 200);

      await onUpload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset after a delay
      setTimeout(() => {
        setFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 1500);
    } catch (err) {
      setError("Upload failed. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">
                Drag & drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports {accept} files up to {maxSize}MB
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="rounded-full p-1 hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {isUploading ? (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                className="w-full"
              >
                Upload File
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
