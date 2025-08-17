// src/app/api/reorder-analysis/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const stockCollection = db.collection("stock");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const skip = (page - 1) * limit;

    const basePipeline: any[] = [
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
      {
        $match: {
          $or: [
            { stock_left: { $lt: 0 } },
            { stock_used: { $gt: "$stock_left" } },
          ],
        },
      },
    ];

    const countPipeline = [...basePipeline, { $count: "total" }];
    const totalResults = await stockCollection
      .aggregate(countPipeline)
      .toArray();
    const totalItems = totalResults[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const dataPipeline = [
      ...basePipeline,
      {
        $lookup: {
          from: "itemMaster",
          localField: "_id",
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
            manufacturer: "$itemDetails.Manufacturer", // <-- ADDED
            vendor: "$itemDetails.Vendor", // <-- ADDED
          },
        },
      },
      { $sort: { "item.itemName": 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const results = await stockCollection.aggregate(dataPipeline).toArray();

    return NextResponse.json({ results, totalPages });
  } catch (error: any) {
    console.error("--- [API] GET reorder analysis failed ---");
    console.error(error);
    return NextResponse.json(
      {
        message: "An error occurred while fetching reorder analysis results.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
