import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodId = url.searchParams.get("period_id");
  const chapterRaw = Number(url.searchParams.get("chapter") ?? "0");
  const chapter = Number.isFinite(chapterRaw) ? Math.max(0, Math.floor(chapterRaw)) : 0;
  const characterId = url.searchParams.get("character_id");
  const q = (url.searchParams.get("q") ?? "").trim();
  const cursorRaw = Number(url.searchParams.get("cursor") ?? "0");
  const cursor = Number.isFinite(cursorRaw) ? Math.max(0, Math.floor(cursorRaw)) : 0;

  const dataset = await getStoryDataset();
  if (periodId && !dataset.periods.some((period) => period.id === periodId)) {
    return NextResponse.json({ data: [], total: 0, nextCursor: null });
  }

  const filtered = dataset.events
    .filter((event) => (periodId ? event.period_id === periodId : true))
    .filter((event) => (chapter ? event.chapter === chapter : true))
    .filter((event) => (characterId ? event.character_ids.includes(characterId) : true))
    .filter((event) =>
      q
        ? [event.title, event.background, event.process, event.result].join(" ").toLowerCase().includes(q.toLowerCase())
        : true
    )
    .sort((a, b) => a.chapter - b.chapter || a.seq_in_chapter - b.seq_in_chapter);

  const page = filtered.slice(cursor, cursor + PAGE_SIZE);
  const nextCursor = cursor + PAGE_SIZE < filtered.length ? cursor + PAGE_SIZE : null;

  return NextResponse.json({ data: page, total: filtered.length, nextCursor });
}
