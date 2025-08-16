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
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("No sheets found in the Stock Balance workbook.");

  const dateCell = sheet["B3"];
  const dateRaw = dateCell?.w || dateCell?.v?.toString() || "";
  console.log(`[Parser-StockBalance] Reading date from cell B3: "${dateRaw}"`);
  const dateMatch = dateRaw.match(/From Date : (\d{2}-\d{2}-\d{4})/);
  if (!dateMatch)
    throw new Error(
      "Could not find a valid start date (dd-mm-yyyy) in cell B3."
    );
  const asOfDate = parseDate(dateMatch[1]);
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

  // **THE FIX: Use header: 1 to auto-detect headers, and defval for empty cells**
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as any[];
  // Find header row index (row 4 as per user, which is index 3)
  const headerRowIndex = 3;
  const headers = jsonData[headerRowIndex];
  const dataRows = jsonData.slice(headerRowIndex + 2); // Data starts 2 rows after header

  const aggregatedData = new Map<string, AggregatedStockItem>();
  console.log(
    `[Parser-StockBalance]  => Found ${dataRows.length} total entries. Aggregating by Item Code...`
  );

  for (const rowArray of dataRows) {
    const row: any = {};
    headers.forEach((header: string, index: number) => {
      row[header] = rowArray[index];
    });

    const itemCode = row["Item Code"];
    const qty = parseFloat(row["Qty"]);

    if (itemCode && !isNaN(qty)) {
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
