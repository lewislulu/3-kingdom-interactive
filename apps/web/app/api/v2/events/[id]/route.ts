import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const dataset = await getStoryDataset();
  const event = dataset.events.find((item) => item.id === id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ data: event });
}
