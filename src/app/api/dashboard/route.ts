// src/app/api/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const stockCollection = db.collection("stock");
    const departmentsCollection = db.collection("departments");
    const itemMasterCollection = db.collection("itemMaster");

    // Get the most recent date from the stock records
    const latestStockEntry = await stockCollection.findOne(
      {},
      { sort: { as_of_date: -1 } }
    );
    if (!latestStockEntry) {
      return NextResponse.json({
        kpis: {
          totalStock: 0,
          totalSold: 0,
          lowStockCount: 0,
        },
        stockByDept: [],
        topSoldItems: [],
        topStockedItems: [],
      });
    }
    const asOfDate = latestStockEntry.as_of_date;

    // --- KPIs ---
    const kpiPipeline = [
      { $match: { as_of_date: asOfDate } },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock_left" },
          totalSold: { $sum: "$stock_sold" },
        },
      },
    ];
    const kpiResult = await stockCollection.aggregate(kpiPipeline).toArray();
    const lowStockCount = await stockCollection.countDocuments({
      as_of_date: asOfDate,
      stock_left: { $lte: 10, $gt: 0 }, // Example: low stock is 10 or less
    });

    const kpis = {
      totalStock: kpiResult[0]?.totalStock || 0,
      totalSold: kpiResult[0]?.totalSold || 0,
      lowStockCount: lowStockCount,
    };

    // --- Stock by Department ---
    const stockByDeptPipeline = [
      { $match: { as_of_date: asOfDate } },
      {
        $group: {
          _id: "$departmentId",
          totalStock: { $sum: "$stock_left" },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "departmentInfo",
        },
      },
      { $unwind: "$departmentInfo" },
      {
        $project: {
          name: "$departmentInfo.name",
          value: "$totalStock",
        },
      },
    ];
    const stockByDept = await stockCollection
      .aggregate(stockByDeptPipeline)
      .toArray();

    // --- Top 10 Sold Items ---
    const topSoldItemsPipeline = [
      { $match: { as_of_date: asOfDate } },
      {
        $group: {
          _id: "$itemId",
          totalSold: { $sum: "$stock_sold" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "itemMaster",
          localField: "_id",
          foreignField: "_id",
          as: "itemInfo",
        },
      },
      { $unwind: "$itemInfo" },
      {
        $project: {
          name: "$itemInfo.Item Name",
          value: "$totalSold",
        },
      },
    ];
    const topSoldItems = await stockCollection
      .aggregate(topSoldItemsPipeline)
      .toArray();

    // --- Top 10 Stocked Items ---
    const topStockedItemsPipeline = [
      { $match: { as_of_date: asOfDate } },
      {
        $group: {
          _id: "$itemId",
          totalStock: { $sum: "$stock_left" },
        },
      },
      { $sort: { totalStock: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "itemMaster",
          localField: "_id",
          foreignField: "_id",
          as: "itemInfo",
        },
      },
      { $unwind: "$itemInfo" },
      {
        $project: {
          name: "$itemInfo.Item Name",
          value: "$totalStock",
        },
      },
    ];
    const topStockedItems = await stockCollection
      .aggregate(topStockedItemsPipeline)
      .toArray();

    return NextResponse.json({
      kpis,
      stockByDept,
      topSoldItems,
      topStockedItems,
    });
  } catch (error: any) {
    console.error("--- [API] Dashboard data fetch failed ---", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard data", error: error.message },
      { status: 500 }
    );
  }
}
