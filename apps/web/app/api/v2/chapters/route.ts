import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodId = url.searchParams.get("period_id");
  const fromRaw = Number(url.searchParams.get("from") ?? "1");
  const toRaw = Number(url.searchParams.get("to") ?? "120");
  const fromSafe = Number.isFinite(fromRaw) ? Math.max(1, Math.floor(fromRaw)) : 1;
  const toSafe = Number.isFinite(toRaw) ? Math.min(120, Math.floor(toRaw)) : 120;
  const from = Math.min(fromSafe, toSafe);
  const to = Math.max(fromSafe, toSafe);

  const dataset = await getStoryDataset();
  if (periodId && !dataset.periods.some((period) => period.id === periodId)) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const filtered = dataset.chapters.filter((chapter) => {
    if (periodId && chapter.period_id !== periodId) return false;
    return chapter.number >= from && chapter.number <= to;
  });

  return NextResponse.json({ data: filtered, total: filtered.length });
}
