import * as XLSX from "xlsx";
import { parseDate } from "./utils";

export function parseSalesReport(
  workbook: XLSX.WorkBook,
  expectedDept: string,
  expectedDate: Date
) {
  console.log("\n[Parser] 2. Parsing Sales Report...");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const deptCell = sheet["A3"];
  const deptRaw = deptCell?.w || deptCell?.v?.toString() || "";
  console.log(`[Parser-Sales] Reading department from cell A3: "${deptRaw}"`);
  if (!deptRaw.includes(`( SRST-${expectedDept} PHARMACY )`)) {
    throw new Error(
      `Sales Report is not for the selected department "${expectedDept}".`
    );
  }

  const dateCell = sheet["A4"];
  const dateRaw = dateCell?.w || dateCell?.v?.toString() || "";
  const dateMatch = dateRaw.match(/(\d{2}-\d{2}-\d{4})/);
  if (!dateMatch)
    throw new Error(
      "Could not find a valid date in cell A4 of the sales report."
    );
  const reportDate = parseDate(dateMatch[0]);
  if (reportDate.getTime() !== expectedDate.getTime()) {
    throw new Error(
      `Sales report start date (${reportDate.toLocaleDateString()}) does not match the stock balance date (${expectedDate.toLocaleDateString()}).`
    );
  }
  console.log("[Parser-Sales]  => Dates match successfully.");

  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 4 }) as any[];
  const salesMap = new Map<string, number>();
  console.log(
    `[Parser-Sales]  => Found ${jsonData.length} total sales entries. Aggregating by Item Code...`
  );

  jsonData.forEach((row) => {
    const itemCode = row["Item code"];
    const qty = row["Sales Qty"];
    if (itemCode && typeof qty === "number") {
      // **THE FIX: Standardize the key**
      const sItemCode = String(itemCode).trim();
      if (!sItemCode) return;

      const currentQty = salesMap.get(sItemCode) || 0;
      salesMap.set(sItemCode, currentQty + qty);
    }
  });
  console.log(
    `[Parser-Sales]  => Aggregation complete. Total unique items sold: ${salesMap.size}.`
  );
  return salesMap;
}
