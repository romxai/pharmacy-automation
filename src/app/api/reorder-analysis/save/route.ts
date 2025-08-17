// src/app/api/reorder-analysis/save/route.ts

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";
import { ISavedReorderAnalysis } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { surplusPercentage, items } = await req.json();

    const client = await clientPromise;
    const db = client.db("pharmacy");
    const reorderCollection: Collection<ISavedReorderAnalysis> =
      db.collection("reorderAnalysis");

    const newAnalysis: ISavedReorderAnalysis = {
      createdAt: new Date(),
      surplusPercentage,
      items: items.map((item: any) => ({
        ...item,
        itemId: new ObjectId(item.itemId),
      })),
    };

    await reorderCollection.insertOne(newAnalysis);

    return NextResponse.json({
      message: "Reorder analysis saved successfully.",
    });
  } catch (error: any) {
    console.error("--- [API] POST reorder analysis failed ---");
    console.error(error);
    return NextResponse.json(
      {
        message: "An error occurred while saving the reorder analysis.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("pharmacy");
    const reorderCollection: Collection<ISavedReorderAnalysis> =
      db.collection("reorderAnalysis");

    const latestAnalysis = await reorderCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latestAnalysis.length > 0) {
      return NextResponse.json(latestAnalysis[0]);
    } else {
      return NextResponse.json(null);
    }
  } catch (error: any) {
    console.error("--- [API] GET saved reorder analysis failed ---");
    console.error(error);
    return NextResponse.json(
      {
        message: "An error occurred while fetching the saved reorder analysis.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
