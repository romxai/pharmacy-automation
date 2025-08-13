// src/types/index.ts

/**
 * Interface representing a single row from the uploaded GRN Excel file.
 */
export interface GRNEntry {
  "S.No": number;
  "GRN No": string;
  "Invoice No": string;
  "GRN Date": string; // Stored as a string initially, then converted
  "Item Code": string;
  "Item Name": string;
  "Free Qty": number;
  Qty: number;
  Manufacturer: string;
  Vendor: string;
  Units: string;
  MRP: number;
  "Item Cost": number;
  NetAmount: number;
  "Unit Rate": number;
}

/**
 * Interface for the data stored in the MongoDB 'itemMaster' collection.
 * The GRN Date is stored as an ISO string for consistent sorting.
 */
export interface ItemMasterEntry extends Omit<GRNEntry, "GRN Date"> {
  _id?: string; // MongoDB's unique identifier
  "GRN Date": string; // Stored as ISO 8601 string (e.g., "2024-10-08T00:00:00.000Z")
}
