// src/app/api/item-master/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MongoClient, Db, Filter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { ItemMasterEntry } from "@/types";

const DB_NAME = process.env.DB_NAME || "pharmacy";
const COLLECTION_NAME = "itemMaster";

/**
 * Handles the GET request to fetch items from the item master with pagination and search.
 */
export async function GET(req: NextRequest) {
  try {
    const client: MongoClient = await clientPromise;
    const db: Db = client.db(DB_NAME);
    const collection = db.collection<ItemMasterEntry>(COLLECTION_NAME);

    // Get query parameters from the URL
    const { searchParams } = req.nextUrl;
    const searchQuery = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const fetchAll = searchParams.get("fetchAll") === "true";

    // Build the MongoDB query based on the search term
    const query: Filter<ItemMasterEntry> = {};
    if (searchQuery) {
      query.$or = [
        { "Item Name": { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
        { "Item Code": { $regex: searchQuery, $options: "i" } },
      ];
    }

    // If fetchAll is true (for exporting), ignore pagination
    if (fetchAll) {
      const allItems = await collection
        .find(query)
        .sort({ "Item Name": 1 })
        .toArray();
      return NextResponse.json(
        { items: allItems, totalPages: 1, totalItems: allItems.length },
        { status: 200 }
      );
    }

    // Get the total count of documents matching the query for pagination
    const totalItems = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    // Fetch the paginated data
    const items = await collection
      .find(query)
      .sort({ "Item Name": 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json(
      { items, totalPages, totalItems },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching item master data:", error);
    return NextResponse.json(
      { message: "Failed to fetch item master data." },
      { status: 500 }
    );
  }
}

// Optional: Force dynamic rendering to ensure fresh data on every request.
export const dynamic = "force-dynamic";
