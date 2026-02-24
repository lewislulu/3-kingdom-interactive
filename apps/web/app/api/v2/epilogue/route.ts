import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET() {
  const dataset = await getStoryDataset();
  return NextResponse.json({ data: dataset.epilogue, total: dataset.epilogue.length });
}
