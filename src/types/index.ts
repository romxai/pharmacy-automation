// src/types/index.ts

/**
 * Interface representing a single row from the uploaded GRN Excel file.
 */
export interface GRNEntry {
  "S.No": number;
  "GRN No": string;
  "Invoice No": string;
  "GRN Date": string;
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
 */
export interface ItemMasterEntry extends Omit<GRNEntry, "GRN Date"> {
  _id?: string;
  "GRN Date": string;
}

/**
 * Interface for the Item Master collection.
 */
export interface IItem {
  _id?: any; // ObjectId from MongoDB
  itemCode: string;
  itemName: string;
  vendor: string;
  manufacturer: string;
  itemType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**

 * Interface representing a Department in the database.
 */
export interface IDepartment {
  _id?: any; // ObjectId from MongoDB
  name: string;
}

/**
 * Interface representing a final Stock record in the database.
 */
export interface IStock {
  _id?: any; // ObjectId from MongoDB
  itemId: any; // Storing ObjectId of the item
  departmentId: any; // Storing ObjectId of the department
  initial_stock: number;
  stock_sold: number;
  stock_transferred: number;
  stock_used: number;
  stock_left: number;
  as_of_date: Date;
}

// --- VVV ADD THE NEW INTERFACES BELOW VVV ---

/**
 * Interface representing a single item in a saved reorder analysis.
 */
export interface IReorderAnalysisItem {
  itemId: any; // ObjectId of the item
  itemCode: string;
  itemName: string;
  stock_left: number;
  stock_used: number;
  reorder_quantity: number;
}

/**
 * Interface for a saved reorder analysis document.
 */
export interface ISavedReorderAnalysis {
  _id?: any; // ObjectId from MongoDB
  createdAt: Date;
  surplusPercentage: number;
  items: IReorderAnalysisItem[];
}
