// src/app/api/stock-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import * as XLSX from "xlsx";
import { IStock, ItemMasterEntry } from "@/types";
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

const processDepartmentFiles = async (
  departmentName: string,
  stockBalanceFile: File,
  salesReportFile: File,
  itemMaster: ItemMasterEntry[]
) => {
  const stockBalanceBuffer = await stockBalanceFile.arrayBuffer();
  const stockWb = XLSX.read(stockBalanceBuffer);
  const { asOfDate, aggregatedData: stockMap } = parseStockBalanceSheet(
    stockWb,
    departmentName
  );

  const salesBuffer = await salesReportFile.arrayBuffer();
  const salesWb = XLSX.read(salesBuffer);
  const salesMap = parseSalesReport(salesWb, departmentName, asOfDate);

  const calculationMap = new Map<string, StockCalculationData>();
  for (const masterItem of itemMaster) {
    const itemCode = String(masterItem["Item Code"]).trim();
    if (itemCode) {
      calculationMap.set(itemCode, {
        itemName: masterItem["Item Name"],
        initialStock: 0,
        sold: 0,
        transferred: 0,
        manufacturer: masterItem.Manufacturer || "N/A",
        itemType: "N/A",
      });
    }
  }

  for (const [itemCode, stockDetails] of stockMap.entries()) {
    if (calculationMap.has(itemCode)) {
      const entry = calculationMap.get(itemCode)!;
      entry.initialStock = stockDetails.totalQty;
      entry.itemType = stockDetails.category;
    }
  }

  for (const [itemCode, soldQty] of salesMap.entries()) {
    if (calculationMap.has(itemCode)) {
      calculationMap.get(itemCode)!.sold = soldQty;
    }
  }

  return { calculationMap, asOfDate };
};

export async function POST(req: NextRequest) {
  console.log("\n--- [API] Starting Stock Analysis Orchestration ---");
  try {
    const formData = await req.formData();
    const updateType = formData.get("updateType") as string;

    const client = await clientPromise;
    const db = client.db("pharmacy");
    const itemMasterCollection: Collection<ItemMasterEntry> =
      db.collection("itemMaster");
    const allMasterItems = await itemMasterCollection.find({}).toArray();
    if (allMasterItems.length === 0) {
      throw new Error("The 'itemMaster' collection is empty.");
    }
    const stockCollection: Collection<IStock> = db.collection("stock");
    const departmentsCollection = db.collection("departments");

    if (updateType === "single") {
      const departmentName = formData.get("department") as string;
      const stockBalanceFile = formData.get("stock_balance_file") as File;
      const salesReportFile = formData.get("sales_report_file") as File;

      const { calculationMap, asOfDate } = await processDepartmentFiles(
        departmentName,
        stockBalanceFile,
        salesReportFile,
        allMasterItems
      );
      // In single update, transfer is not recalculated, but read from the transfer sheet.
      const stockTransferFile = formData.get("stock_transfer_file") as File;
      if (stockTransferFile) {
        const transferBuffer = await stockTransferFile.arrayBuffer();
        const transferWb = XLSX.read(transferBuffer);
        const transferMap = parseStockTransferSheet(transferWb, departmentName);

        for (const [itemCode, transferredQty] of transferMap.entries()) {
          if (calculationMap.has(itemCode)) {
            calculationMap.get(itemCode)!.transferred = transferredQty;
          }
        }
      }

      // DB Operations
      const departmentObj = await departmentsCollection.findOneAndUpdate(
        { name: departmentName },
        { $set: { name: departmentName, lastUpdated: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      if (!departmentObj)
        throw new Error("Could not find or create department.");

      await stockCollection.deleteMany({
        departmentId: departmentObj._id,
        as_of_date: asOfDate,
      });

      const stockRecordsToInsert: IStock[] = [];
      for (const [itemCode, calcData] of calculationMap.entries()) {
        const masterItem = allMasterItems.find(
          (item) => String(item["Item Code"]).trim() === itemCode
        );
        if (!masterItem) continue;

        const stockUsed = calcData.sold + calcData.transferred;
        stockRecordsToInsert.push({
          // @ts-ignore
          itemId: new ObjectId(masterItem._id),
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
      return NextResponse.json({
        message: `Successfully processed for ${departmentName}.`,
      });
    } else if (updateType === "full" || updateType === "transfer") {
      const stockTransferFile = formData.get("stock_transfer_file") as File;
      if (!stockTransferFile) throw new Error("Transfer sheet is required.");

      const transferBuffer = await stockTransferFile.arrayBuffer();
      const transferWb = XLSX.read(transferBuffer);
      const departments = ["IP", "OP", "OT"];
      let unifiedAsOfDate: Date | null = null;

      if (updateType === "full") {
        for (const dept of departments) {
          const stockBalanceFile = formData.get(
            `${dept.toLowerCase()}_stock_balance_file`
          ) as File;
          const salesReportFile = formData.get(
            `${dept.toLowerCase()}_sales_report_file`
          ) as File;
          if (!stockBalanceFile || !salesReportFile)
            throw new Error(`Missing files for ${dept}`);

          const { calculationMap, asOfDate } = await processDepartmentFiles(
            dept,
            stockBalanceFile,
            salesReportFile,
            allMasterItems
          );
          if (!unifiedAsOfDate) unifiedAsOfDate = asOfDate;

          const transferMap = parseStockTransferSheet(transferWb, dept);
          for (const [itemCode, transferredQty] of transferMap.entries()) {
            if (calculationMap.has(itemCode)) {
              calculationMap.get(itemCode)!.transferred = transferredQty;
            }
          }

          // DB Operations for each department
          const departmentObj = await departmentsCollection.findOneAndUpdate(
            { name: dept },
            { $set: { name: dept, lastUpdated: new Date() } },
            { upsert: true, returnDocument: "after" }
          );
          if (!departmentObj)
            throw new Error("Could not find or create department.");

          await stockCollection.deleteMany({
            departmentId: departmentObj._id,
            as_of_date: asOfDate,
          });

          const stockRecordsToInsert: IStock[] = [];
          for (const [itemCode, calcData] of calculationMap.entries()) {
            const masterItem = allMasterItems.find(
              (item) => String(item["Item Code"]).trim() === itemCode
            );
            if (!masterItem) continue;

            const stockUsed = calcData.sold + calcData.transferred;
            stockRecordsToInsert.push({
              // @ts-ignore
              itemId: new ObjectId(masterItem._id),
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
        }
      } else {
        // This handles updateType === 'transfer'
        const latestStockEntry = await stockCollection.findOne(
          {},
          { sort: { as_of_date: -1 } }
        );
        if (!latestStockEntry) {
          throw new Error(
            "No existing stock records found to update. Please do a full update first."
          );
        }
        unifiedAsOfDate = latestStockEntry.as_of_date;
        console.log(
          `[API] Found latest stock date for transfer update: ${unifiedAsOfDate}`
        );

        for (const dept of departments) {
          const transferMap = parseStockTransferSheet(transferWb, dept);
          const departmentObj = await departmentsCollection.findOne({
            name: dept,
          });
          if (!departmentObj) continue;

          for (const [itemCode, newTransferredQty] of transferMap.entries()) {
            const masterItem = allMasterItems.find(
              (item) => String(item["Item Code"]).trim() === itemCode
            );
            if (!masterItem) continue;

            const existingRecord = await stockCollection.findOne({
              itemId: new ObjectId(masterItem._id),
              departmentId: departmentObj._id,
              as_of_date: unifiedAsOfDate,
            });

            if (existingRecord) {
              const oldTransferredQty = existingRecord.stock_transferred || 0;
              const newStockUsed =
                (existingRecord.stock_sold || 0) + newTransferredQty;
              const newStockLeft =
                (existingRecord.initial_stock || 0) - newStockUsed;

              await stockCollection.updateOne(
                { _id: existingRecord._id },
                {
                  $set: {
                    stock_transferred: newTransferredQty,
                    stock_used: newStockUsed,
                    stock_left: newStockLeft,
                  },
                }
              );
            }
          }
          await departmentsCollection.updateOne(
            { _id: departmentObj._id },
            { $set: { lastUpdated: new Date() } }
          );
        }
      }

      return NextResponse.json({ message: "Update completed successfully." });
    }

    throw new Error("Invalid update type.");
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
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const { searchParams } = new URL(req.url);
    const departmentName = searchParams.get("department");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const pipeline: any[] = [];

    if (departmentName && departmentName !== "All Departments") {
      const departmentObj = await db
        .collection("departments")
        .findOne({ name: departmentName });
      if (!departmentObj)
        return NextResponse.json({
          results: [],
          totalPages: 0,
          lastUpdated: null,
        });
      pipeline.push({
        $match: { departmentId: new ObjectId(departmentObj._id) },
      });
    }

    if (departmentName === "All Departments") {
      pipeline.push(
        {
          $group: {
            _id: "$itemId",
            initial_stock: { $sum: "$initial_stock" },
            stock_sold: { $sum: "$stock_sold" },
            stock_transferred: { $sum: "$stock_transferred" },
            stock_used: { $sum: "$stock_used" },
            stock_left: { $sum: "$stock_left" },
          },
        },
        { $addFields: { itemId: "$_id" } }
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: "itemMaster",
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
            itemCode: "$itemDetails.Item Code",
            itemName: "$itemDetails.Item Name",
          },
        },
      },
      { $sort: { "item.itemName": 1 } }
    );

    const stockCollection = db.collection("stock");
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalResults = await stockCollection
      .aggregate(countPipeline)
      .toArray();
    const totalPages = Math.ceil((totalResults[0]?.total || 0) / limit);

    const results = await stockCollection
      .aggregate([...pipeline, { $skip: skip }, { $limit: limit }])
      .toArray();

    let lastUpdated = null;
    if (departmentName !== "All Departments") {
      const dept = await db
        .collection("departments")
        .findOne({ name: departmentName });
      lastUpdated = dept?.lastUpdated || null;
    } else {
      const latestDept = await db
        .collection("departments")
        .find()
        .sort({ lastUpdated: -1 })
        .limit(1)
        .toArray();
      lastUpdated = latestDept[0]?.lastUpdated || null;
    }

    return NextResponse.json({ results, totalPages, lastUpdated });
  } catch (error: any) {
    console.error("--- [API] GET stock analysis failed ---");
    console.error(error);
    return NextResponse.json(
      {
        message: "An error occurred while fetching results.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
