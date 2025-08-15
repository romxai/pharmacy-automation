import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import * as XLSX from "xlsx";
import { IItem, IDepartment, IStock } from "@/types";
import { parseStockBalanceSheet } from "@/lib/parsers/stockBalanceParser";
import { parseSalesReport } from "@/lib/parsers/salesReportParser";
import { parseStockTransferSheet } from "@/lib/parsers/stockTransferParser";

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

    if (
      !departmentName ||
      !stockBalanceFile ||
      !salesReportFile ||
      !stockTransferFile
    ) {
      throw new Error("Missing required files or department name.");
    }
    console.log(`[API] Department selected: ${departmentName}`);

    const stockBalanceBuffer = await stockBalanceFile.arrayBuffer();
    const stockWb = XLSX.read(stockBalanceBuffer);
    const { asOfDate, aggregatedData: stockMap } = parseStockBalanceSheet(
      stockWb,
      departmentName
    );

    const salesBuffer = await salesReportFile.arrayBuffer();
    const salesWb = XLSX.read(salesBuffer);
    const salesMap = parseSalesReport(salesWb, departmentName, asOfDate);

    const transferBuffer = await stockTransferFile.arrayBuffer();
    const transferWb = XLSX.read(transferBuffer);
    const transferMap = parseStockTransferSheet(transferWb, departmentName);

    console.log("\n[API] 4. Starting in-memory calculations...");
    const calculationMap = new Map<string, StockCalculationData>();

    for (const [itemCode, stockDetails] of stockMap.entries()) {
      calculationMap.set(itemCode, {
        itemName: stockDetails.itemName,
        initialStock: stockDetails.totalQty,
        sold: 0,
        transferred: 0,
        manufacturer: stockDetails.subCategory,
        itemType: stockDetails.category,
      });
    }
    console.log(
      `[API]  => Initialized calculation map with ${calculationMap.size} unique items.`
    );

    // **ENHANCED DEBUGGING FOR SALES**
    for (const [itemCode, soldQty] of salesMap.entries()) {
      if (calculationMap.has(itemCode)) {
        calculationMap.get(itemCode)!.sold = soldQty;
        console.log(
          `[API]   [SALES] Match found for ${itemCode}. Setting sold qty to ${soldQty}`
        );
      } else {
        console.warn(
          `[API]   [SALES] WARNING: Item code ${itemCode} from sales report not found in stock balance.`
        );
      }
    }
    console.log(`[API]  => Updated map with sales data.`);

    // **ENHANCED DEBUGGING FOR TRANSFERS**
    for (const [itemCode, transferredQty] of transferMap.entries()) {
      if (calculationMap.has(itemCode)) {
        calculationMap.get(itemCode)!.transferred = transferredQty;
        console.log(
          `[API]   [TRANSFER] Match found for ${itemCode}. Setting transferred qty to ${transferredQty}`
        );
      } else {
        console.warn(
          `[API]   [TRANSFER] WARNING: Item code ${itemCode} from transfer report not found in stock balance.`
        );
      }
    }
    console.log(`[API]  => Updated map with transfer data.`);

    console.log("\n[API] 5. Saving final results to database...");
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const itemsCollection: Collection<IItem> = db.collection("items");
    const departmentsCollection: Collection<IDepartment> =
      db.collection("departments");
    const stockCollection: Collection<IStock> = db.collection("stock");

    const departmentObj = await departmentsCollection.findOneAndUpdate(
      { name: departmentName },
      { $set: { name: departmentName } },
      { upsert: true, returnDocument: "after" }
    );
    if (!departmentObj) throw new Error("Could not create or find department.");

    const deleteResult = await stockCollection.deleteMany({
      departmentId: departmentObj._id,
      as_of_date: asOfDate,
    });
    console.log(
      `[API]  => Deleted ${deleteResult.deletedCount} old stock records.`
    );

    const stockRecordsToInsert: IStock[] = [];
    for (const [itemCode, calcData] of calculationMap.entries()) {
      const itemObj = await itemsCollection.findOneAndUpdate(
        { itemCode: itemCode },
        {
          $set: {
            itemName: calcData.itemName,
            manufacturer: calcData.manufacturer,
            itemType: calcData.itemType,
          },
          $setOnInsert: {
            itemCode: itemCode,
            vendor: "N/A",
            createdAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      if (!itemObj) continue;

      const stockUsed = calcData.sold + calcData.transferred;
      stockRecordsToInsert.push({
        itemId: itemObj._id,
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
    console.log(
      `[API]  => Inserted ${stockRecordsToInsert.length} new stock records.`
    );
    console.log("--- [API] Stock Analysis Process Completed Successfully ---");

    return NextResponse.json({
      message: `Successfully processed ${stockRecordsToInsert.length} records for ${departmentName}.`,
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

export async function GET(req: NextRequest) {
  const client = await clientPromise;
  const db = client.db("pharmacy");
  const stockCollection: Collection<IStock> = db.collection("stock");
  const { searchParams } = new URL(req.url);
  const departmentName = searchParams.get("department");
  const dateStr = searchParams.get("date");

  if (!departmentName || !dateStr) {
    return NextResponse.json(
      { message: "Department and date are required." },
      { status: 400 }
    );
  }
  const departmentObj = await db
    .collection("departments")
    .findOne({ name: departmentName });
  if (!departmentObj) {
    return NextResponse.json([], { status: 200 });
  }
  const asOfDate = new Date(`${dateStr}T12:00:00.000Z`);
  const results = await stockCollection
    .aggregate([
      {
        $match: {
          departmentId: new ObjectId(departmentObj._id),
          as_of_date: asOfDate,
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },
      {
        $project: {
          _id: 1,
          initial_stock: 1,
          stock_sold: 1,
          stock_transferred: 1,
          stock_used: 1,
          stock_left: 1,
          item: {
            itemCode: "$itemDetails.itemCode",
            itemName: "$itemDetails.itemName",
          },
        },
      },
    ])
    .toArray();
  return NextResponse.json(results, { status: 200 });
}
