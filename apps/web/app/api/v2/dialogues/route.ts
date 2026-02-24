import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("event_id");

  const dataset = await getStoryDataset();
  const filtered = dataset.dialogues.filter((dialogue) => (eventId ? dialogue.event_id === eventId : true));

  return NextResponse.json({ data: filtered, total: filtered.length });
}
