import * as XLSX from "xlsx";

export function parseStockTransferSheet(
  workbook: XLSX.WorkBook,
  departmentName: string
) {
  console.log("\n[Parser] 3. Parsing Stock Transfer Sheet...");
  const sheet = workbook.Sheets["stocktransferstatistics"];
  if (!sheet)
    throw new Error("Sheet named 'stocktransferstatistics' not found.");

  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: 3 }) as any[];
  const transferMap = new Map<string, number>();
  console.log(
    `[Parser-Transfer]  => Found ${jsonData.length} total transfer entries. Aggregating by Item Code...`
  );

  jsonData.forEach((row) => {
    // Column F in Excel corresponds to the "From store" header
    if (row["From store"] === `SRST-${departmentName} PHARMACY`) {
      const itemCode = row["Item Code"];
      const qty = row["Qty"];
      if (itemCode && typeof qty === "number") {
        // **THE FIX: Standardize the key**
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
