import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodId = url.searchParams.get("period_id");
  const camp = url.searchParams.get("camp");

  const dataset = await getStoryDataset();
  if (periodId && !dataset.periods.some((period) => period.id === periodId)) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const chapterSet = new Set(
    dataset.chapters
      .filter((chapter) => (periodId ? chapter.period_id === periodId : true))
      .map((chapter) => chapter.number)
  );
  const chapterList = [...chapterSet];
  const chapterMin = chapterList.length ? Math.min(...chapterList) : 1;
  const chapterMax = chapterList.length ? Math.max(...chapterList) : 120;

  const filtered = dataset.characters.filter((character) => {
    if (camp && character.camp !== camp) return false;
    if (!periodId) return true;
    return !(character.last_chapter < chapterMin || character.first_chapter > chapterMax);
  });

  return NextResponse.json({ data: filtered, total: filtered.length });
}
