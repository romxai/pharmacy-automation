// src/app/api/stock-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import * as XLSX from "xlsx";
import { IStock, ItemMasterEntry } from "@/types";
import { parseStockBalanceSheet } from "@/lib/parsers/stockBalanceParser";
import { parseSalesReport } from "@/lib/parsers/salesReportParser";
import { parseStockTransferSheet } from "@/lib/parsers/stockTransferParser";

// ... (POST function remains the same)

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const { searchParams } = new URL(req.url);
    const departmentName = searchParams.get("department");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30"); // <--- UPDATED
    const skip = (page - 1) * limit;

    const pipeline: any[] = [];

    const activityFilter = {
      $match: {
        $or: [
          { initial_stock: { $ne: 0 } },
          { stock_sold: { $ne: 0 } },
          { stock_transferred: { $ne: 0 } },
        ],
      },
    };

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
      pipeline.push(activityFilter);
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
      pipeline.push(activityFilter);
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
