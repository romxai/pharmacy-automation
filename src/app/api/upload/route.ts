// src/app/api/upload/route.ts (For Raw Data Dumping)

import { NextRequest, NextResponse } from "next/server";
import { read, utils } from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Received file: ${file.name}`);
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // --- NEW DEBUGGING STEP ---
    // Convert the sheet to an array of arrays to see the raw cell values.
    const rawDataAsArray: any[][] = utils.sheet_to_json(sheet, { header: 1 });

    console.log("\n\n--- [RAW DATA DUMP] ---");
    console.log("Dumping the first 10 rows of the sheet as raw arrays:");

    // Log the first 10 rows for inspection
    for (let i = 0; i < 10 && i < rawDataAsArray.length; i++) {
      console.log(`Row ${i + 1}:`, rawDataAsArray[i]);
    }

    console.log("--- [END RAW DATA DUMP] ---\n\n");

    return NextResponse.json(
      {
        message:
          "Raw data dumped to server console. Please check the terminal output and share it.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DEBUG] An error occurred during file reading:", error);
    return NextResponse.json(
      { message: "An error occurred while reading the file." },
      { status: 500 }
    );
  }
}
