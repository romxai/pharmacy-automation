// src/app/api/item-master/route.ts

import { NextResponse } from "next/server";
import { MongoClient, Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { ItemMasterEntry } from "@/types";

const DB_NAME = process.env.DB_NAME || "pharmacy";
const COLLECTION_NAME = "itemMaster";

/**
 * Handles the GET request to fetch all items from the item master.
 */
export async function GET() {
  try {
    const client: MongoClient = await clientPromise;
    const db: Db = client.db(DB_NAME);
    const collection = db.collection<ItemMasterEntry>(COLLECTION_NAME);

    // Fetch all items and sort them alphabetically by Item Name
    const items = await collection.find({}).sort({ "Item Name": 1 }).toArray();

    return NextResponse.json(items, { status: 200 });
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
