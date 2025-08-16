import * as XLSX from "xlsx";

export function parseStockTransferSheet(
  workbook: XLSX.WorkBook,
  departmentName: string
) {
  console.log("\n[Parser] 3. Parsing Stock Transfer Sheet...");
  const sheet = workbook.Sheets["stocktransferstatistics"];
  if (!sheet)
    throw new Error("Sheet named 'stocktransferstatistics' not found.");

  // **THE FIX: Use header: 1 to auto-detect headers, and defval for empty cells**
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as any[];
  // Find header row index (row 4 as per user, which is index 3)
  const headerRowIndex = 3;
  const headers = jsonData[headerRowIndex];
  const dataRows = jsonData.slice(headerRowIndex + 1); // Data starts on the next row

  const transferMap = new Map<string, number>();
  console.log(
    `[Parser-Transfer]  => Found ${dataRows.length} total transfer entries. Aggregating by Item Code...`
  );

  dataRows.forEach((rowArray) => {
    const row: any = {};
    headers.forEach((header: string, index: number) => {
      row[header] = rowArray[index];
    });

    if (row["From store"] === `SRST-${departmentName} PHARMACY`) {
      const itemCode = row["Item Code"];
      const qty = parseFloat(row["Qty"]);
      if (itemCode && !isNaN(qty)) {
        const sItemCode = String(itemCode).trim();
        if (!sItemCode) return;

        const currentQty = transferMap.get(sItemCode) || 0;
        transferMap.set(sItemCode, currentQty + qty);
      }
    }
  });
  console.log(
    `[Parser-Transfer]  => Aggregation complete. Total unique items transferred out: ${transferMap.size}.`
  );
  return transferMap;
}
