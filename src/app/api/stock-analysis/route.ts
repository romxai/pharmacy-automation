import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import * as XLSX from "xlsx";
import { IItem, IDepartment, IStock, ItemMasterEntry } from "@/types";
import { parseStockBalanceSheet } from "@/lib/parsers/stockBalanceParser";
import { parseSalesReport } from "@/lib/parsers/salesReportParser";
import { parseStockTransferSheet } from "@/lib/parsers/stockTransferParser";

// This interface defines the structure for our in-memory data processing
interface StockCalculationData {
  itemName: string;
  initialStock: number;
  sold: number;
  transferred: number;
  manufacturer: string;
  itemType: string;
}

export async function POST(req: NextRequest) {
  console.log("\n--- [API] Starting Stock Analysis Orchestration ---");
  try {
    const formData = await req.formData();
    const departmentName = formData.get("department") as string;
    const stockBalanceFile = formData.get("stock_balance_file") as File;
    const salesReportFile = formData.get("sales_report_file") as File;
    const stockTransferFile = formData.get("stock_transfer_file") as File;

    if (!departmentName || !stockBalanceFile || !salesReportFile || !stockTransferFile) {
      throw new Error("Missing required files or department name.");
    }
    console.log(`[API] Department selected: ${departmentName}`);

    // --- Step 1: Connect to DB and Fetch the Master Item List ---
    console.log("\n[API] 1. Fetching master list from 'itemMaster' collection...");
    const client = await clientPromise;
    const db = client.db("pharmacy"); // Ensure database name is correct
    const itemMasterCollection: Collection<ItemMasterEntry> = db.collection("itemMaster");
    
    const allMasterItems = await itemMasterCollection.find({}).toArray();
    if (allMasterItems.length === 0) {
        throw new Error("The 'itemMaster' collection is empty. Please process a GRN sheet first.");
    }
    console.log(`[API]  => Found ${allMasterItems.length} total items in the master list.`);

    // --- Step 2: Parse all uploaded files to get transactional data ---
    const stockBalanceBuffer = await stockBalanceFile.arrayBuffer();
    const stockWb = XLSX.read(stockBalanceBuffer);
    const { asOfDate, aggregatedData: stockMap } = parseStockBalanceSheet(stockWb, departmentName);

    const salesBuffer = await salesReportFile.arrayBuffer();
    const salesWb = XLSX.read(salesBuffer);
    const salesMap = parseSalesReport(salesWb, departmentName, asOfDate);

    const transferBuffer = await stockTransferFile.arrayBuffer();
    const transferWb = XLSX.read(transferBuffer);
    const transferMap = parseStockTransferSheet(transferWb, departmentName);

    // --- Step 3: Build a Comprehensive Calculation Map from the Master List ---
    console.log("\n[API] 2. Building comprehensive calculation map...");
    const calculationMap = new Map<string, StockCalculationData>();

    for (const masterItem of allMasterItems) {
      const itemCode = String(masterItem["Item Code"]).trim();
      if (itemCode) {
        calculationMap.set(itemCode, {
          itemName: masterItem["Item Name"],
          initialStock: 0, // Default to 0
          sold: 0,         // Default to 0
          transferred: 0,  // Default to 0
          manufacturer: masterItem.Manufacturer || "N/A",
          itemType: "N/A", // Will be updated from stock balance if available
        });
      }
    }
    console.log(`[API]  => Initialized calculation map with ${calculationMap.size} items from the master list.`);

    // --- Step 4: Populate the Calculation Map with data from parsed files ---
    console.log("\n[API] 3. Populating map with parsed file data...");

    // 4a. Populate with initial stock
    for (const [itemCode, stockDetails] of stockMap.entries()) {
      if (calculationMap.has(itemCode)) {
        const entry = calculationMap.get(itemCode)!;
        entry.initialStock = stockDetails.totalQty;
        entry.itemType = stockDetails.category; // Update with more current info
      } else {
        console.warn(`[API]   [BALANCE] WARNING: Item code ${itemCode} from stock balance not in master list. Skipping.`);
      }
    }
    console.log(`[API]  => Populated with initial stock data.`);

    // 4b. Populate with sales
    for (const [itemCode, soldQty] of salesMap.entries()) {
      if (calculationMap.has(itemCode)) {
        calculationMap.get(itemCode)!.sold = soldQty;
      } else {
        console.warn(`[API]   [SALES] WARNING: Item code ${itemCode} from sales report not in master list. Skipping.`);
      }
    }
    console.log(`[API]  => Populated with sales data.`);

    // 4c. Populate with transfers
    for (const [itemCode, transferredQty] of transferMap.entries()) {
      if (calculationMap.has(itemCode)) {
        calculationMap.get(itemCode)!.transferred = transferredQty;
      } else {
        console.warn(`[API]   [TRANSFER] WARNING: Item code ${itemCode} from transfer report not in master list. Skipping.`);
      }
    }
    console.log(`[API]  => Populated with transfer data.`);

    // --- Step 5: Final Database Transaction ---
    console.log("\n[API] 4. Saving final results to database...");
    const departmentsCollection: Collection<IDepartment> = db.collection("departments");
    const stockCollection: Collection<IStock> = db.collection("stock");

    const departmentObj = await departmentsCollection.findOneAndUpdate(
      { name: departmentName }, { $set: { name: departmentName } }, { upsert: true, returnDocument: "after" }
    );
    if (!departmentObj) throw new Error("Could not create or find department.");

    const deleteResult = await stockCollection.deleteMany({
      departmentId: departmentObj._id,
      as_of_date: asOfDate,
    });
    console.log(`[API]  => Deleted ${deleteResult.deletedCount} old stock records for this date.`);

    const stockRecordsToInsert: IStock[] = [];
    for (const [itemCode, calcData] of calculationMap.entries()) {
      const masterItem = allMasterItems.find(item => String(item["Item Code"]).trim() === itemCode);
      if(!masterItem) continue; // Should not happen, but a good safeguard

      const stockUsed = calcData.sold + calcData.transferred;
      stockRecordsToInsert.push({
        // @ts-ignore
        itemId: new ObjectId(masterItem._id), // Use the ID from the master list
        departmentId: departmentObj._id,
        initial_stock: calcData.initialStock,
        stock_sold: calcData.sold,
        stock_transferred: calcData.transferred,
        stock_used: stockUsed,
        stock_left: calcData.initialStock - stockUsed,
        as_of_date: asOfDate,
      });
    }

    if (stockRecordsToInsert.length > 0) {
      await stockCollection.insertMany(stockRecordsToInsert);
    }
    console.log(`[API]  => Inserted ${stockRecordsToInsert.length} new stock records.`);
    console.log("--- [API] Stock Analysis Process Completed Successfully ---");

    return NextResponse.json({
      message: `Successfully processed and saved ${stockRecordsToInsert.length} stock records for ${departmentName}.`,
      asOfDate: asOfDate.toISOString().split("T")[0],
    });

  } catch (error: any) {
    console.error("--- [API] Stock analysis failed ---");
    console.error(error);
    return NextResponse.json(
      { message: "An error occurred during processing.", error: error.message },
      { status: 500 }
    );
  }
}

// GET Handler - Updated to join with 'itemMaster'
export async function GET(req: NextRequest) {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const stockCollection: Collection<IStock> = db.collection("stock");
    const { searchParams } = new URL(req.url);
    const departmentName = searchParams.get("department");
    const dateStr = searchParams.get("date");

    if (!departmentName || !dateStr) {
        return NextResponse.json({ message: "Department and date are required." }, { status: 400 });
    }
    const departmentObj = await db.collection("departments").findOne({ name: departmentName });
    if (!departmentObj) {
        return NextResponse.json([], { status: 200 });
    }
    const asOfDate = new Date(`${dateStr}T12:00:00.000Z`);
    const results = await stockCollection.aggregate([
        { $match: { departmentId: new ObjectId(departmentObj._id), as_of_date: asOfDate } },
        {
            $lookup: {
                from: "itemMaster", // Join with itemMaster collection
                localField: "itemId",
                foreignField: "_id",
                as: "itemDetails"
            }
        },
        { $unwind: "$itemDetails" },
        {
            $project: {
                _id: 1, initial_stock: 1, stock_sold: 1, stock_transferred: 1, stock_used: 1, stock_left: 1,
                item: { 
                    itemCode: "$itemDetails.Item Code", // Field names from itemMaster
                    itemName: "$itemDetails.Item Name"  // Field names from itemMaster
                },
            },
        },
        { $sort: { "item.itemName": 1 } } // Sort alphabetically by item name
    ]).toArray();
    return NextResponse.json(results, { status: 200 });
}