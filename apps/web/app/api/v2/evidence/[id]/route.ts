import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const dataset = await getStoryDataset();
  const evidence = dataset.evidence.find((item) => item.id === id);

  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  return NextResponse.json({ data: evidence });
}
