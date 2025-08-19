// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const stockCollection = db.collection("stock");

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const matchFilter =
      Object.keys(dateFilter).length > 0 ? { as_of_date: dateFilter } : {};

    // --- KPIs ---
    const kpiPipeline = [
      { $match: matchFilter },
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
      ...matchFilter,
      stock_left: { $lte: 10, $gt: 0 },
    });

    const kpis = {
      totalStock: kpiResult[0]?.totalStock || 0,
      totalSold: kpiResult[0]?.totalSold || 0,
      lowStockCount: lowStockCount,
    };

    // --- Stock by Department ---
    const stockByDeptPipeline = [
      { $match: matchFilter },
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
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "departmentDetails",
        },
      },
      { $unwind: "$departmentDetails" },
      {
        $group: {
          _id: "$departmentDetails.name",
          value: { $sum: "$stock_left" },
        },
      },
      { $project: { name: "$_id", value: 1, _id: 0 } },
    ];
    const stockByDept = await stockCollection
      .aggregate(stockByDeptPipeline)
      .toArray();

    // --- Sales Trend ---
    const salesTrendPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$as_of_date" } },
          value: { $sum: "$stock_sold" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { name: "$_id", value: 1, _id: 0 } },
    ];
    const salesTrend = await stockCollection
      .aggregate(salesTrendPipeline)
      .toArray();

    // --- Stock vs Sold ---
    const stockVsSoldPipeline = [
      { $match: matchFilter },
      { $sort: { stock_sold: -1 } },
      { $limit: 10 },
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
          name: "$itemDetails.itemName",
          stock_left: "$stock_left",
          stock_sold: "$stock_sold",
          _id: 0,
        },
      },
    ];
    const stockVsSold = await stockCollection
      .aggregate(stockVsSoldPipeline)
      .toArray();

    // --- Vendor Performance ---
    const vendorPerformancePipeline = [
      { $match: matchFilter },
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
        $group: {
          _id: "$itemDetails.Vendor",
          value: { $sum: "$stock_left" },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 5 },
      { $project: { name: "$_id", value: 1, _id: 0 } },
    ];
    const vendorPerformance = await stockCollection
      .aggregate(vendorPerformancePipeline)
      .toArray();

    return NextResponse.json({
      kpis,
      stockByDept,
      salesTrend,
      stockVsSold,
      vendorPerformance,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
