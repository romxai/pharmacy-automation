import * as XLSX from "xlsx";
import { parseDate } from "./utils";

export interface AggregatedStockItem {
  itemName: string;
  totalQty: number;
  category: string;
  subCategory: string;
}

export function parseStockBalanceSheet(
  workbook: XLSX.WorkBook,
  expectedDept: string
) {
  console.log("\n[Parser] 1. Parsing Stock Balance Sheet...");
  const sheet = workbook.Sheets["stockbalance"];
  if (!sheet) throw new Error("Sheet named 'stockbalance' not found.");

  const dateCell = sheet["B3"];
  const dateRaw = dateCell?.w || dateCell?.v?.toString() || "";
  console.log(`[Parser-StockBalance] Reading date from cell B3: "${dateRaw}"`);
  const dateMatch = dateRaw.match(/(\d{2}-\d{2}-\d{4})/);
  if (!dateMatch)
    throw new Error("Could not find a valid date (dd-mm-yyyy) in cell B3.");
  const asOfDate = parseDate(dateMatch[0]);
  console.log(
    `[Parser-StockBalance]  => Parsed 'asOfDate': ${asOfDate.toISOString()}`
  );

  const locationCell = sheet["F5"];
  const locationRaw = locationCell?.w || locationCell?.v?.toString() || "";
  console.log(
    `[Parser-StockBalance] Reading location from cell F5: "${locationRaw}"`
  );
  const deptMatch = locationRaw.match(/SRST-([A-Z]+) PHARMACY/i);
  const actualDept = deptMatch ? deptMatch[1] : "";
  console.log(
    `[Parser-StockBalance]  => Extracted department: "${actualDept}"`
  );
  if (actualDept.toUpperCase() !== expectedDept.toUpperCase()) {
    throw new Error(
      `File department mismatch. Sheet is for "${actualDept}", but you selected "${expectedDept}".`
    );
  }

  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 3 }) as any[];
  const aggregatedData = new Map<string, AggregatedStockItem>();
  console.log(
    `[Parser-StockBalance]  => Found ${jsonData.length} total entries. Aggregating by Item Code...`
  );

  for (const row of jsonData) {
    const itemCode = row["Item Code"];
    const qty = row["Qty"];
    if (itemCode && typeof qty === "number") {
      // **THE FIX: Standardize the key**
      const sItemCode = String(itemCode).trim();
      if (!sItemCode) continue;

      if (aggregatedData.has(sItemCode)) {
        aggregatedData.get(sItemCode)!.totalQty += qty;
      } else {
        aggregatedData.set(sItemCode, {
          itemName: row["Item Name"],
          totalQty: qty,
          category: row["Category"] || "N/A",
          subCategory: row["SubCategory"] || "N/A",
        });
      }
    }
  }
  console.log(
    `[Parser-StockBalance]  => Aggregation complete. Total unique items: ${aggregatedData.size}.`
  );
  return { asOfDate, aggregatedData };
}
