// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import { read, utils } from 'xlsx';
import clientPromise from '@/lib/mongodb';
import { ItemMasterEntry, GRNEntry } from '@/types';

const DB_NAME = process.env.DB_NAME || 'pharmacy';
const COLLECTION_NAME = 'itemMaster';

// This function remains the same
const parseDate = (dateInput: string | Date): Date | null => {
  try {
    if (dateInput instanceof Date) return dateInput;
    if (typeof dateInput !== 'string') return null;
    const parts = dateInput.split(/[-/]/);
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  } catch (e) {
    return null;
  }
};

// This function remains the same
const processData = (data: GRNEntry[]): Record<string, ItemMasterEntry> => {
  const itemMaster: Record<string, ItemMasterEntry> = {};
  if (!data || data.length === 0) return itemMaster;

  data.forEach((row) => {
    const itemCode = row['Item Code'];
    if (!itemCode) return;
    const grnDate = parseDate(row['GRN Date']);
    if (!grnDate) return;

    const existingEntry = itemMaster[itemCode];
    if (!existingEntry || grnDate > new Date(existingEntry['GRN Date'])) {
      itemMaster[itemCode] = { ...row, 'GRN Date': grnDate.toISOString() };
    }
  });
  return itemMaster;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'buffer' });

    // --- THE FIX ---
    // Instead of getting the first sheet, we get the sheet named "Sheet1".
    const sheetName = "Sheet1";
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        return NextResponse.json({ message: `A sheet named "${sheetName}" was not found in the uploaded file.` }, { status: 400 });
    }

    // Since the header is on row 1, we can use the default behavior.
    const rawData: GRNEntry[] = utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'dd-mm-yyyy'
    });

    const itemMasterData = processData(rawData);
    const operations = Object.values(itemMasterData).map((item) => ({
      updateOne: { filter: { 'Item Code': item['Item Code'] }, update: { $set: item }, upsert: true },
    }));

    if (operations.length > 0) {
      const client: MongoClient = await clientPromise;
      const db: Db = client.db(DB_NAME);
      const collection = db.collection<ItemMasterEntry>(COLLECTION_NAME);
      await collection.bulkWrite(operations);
    }

    return NextResponse.json({
      message: `File processed successfully. ${operations.length} records updated/inserted.`,
    }, { status: 200 });

  } catch (error) {
    console.error('[DEBUG] An error occurred in the upload handler:', error);
    return NextResponse.json({ message: 'An error occurred while processing the file.' }, { status: 500 });
  }
}