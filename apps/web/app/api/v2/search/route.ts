import { NextResponse } from "next/server";
import { getStoryDataset } from "@/lib/data";
import { buildSearchIndex } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const scopeParam = url.searchParams.get("scope") ?? "all";
  const scope = (["all", "character", "event", "quote"] as const).includes(
    scopeParam as "all" | "character" | "event" | "quote"
  )
    ? (scopeParam as "all" | "character" | "event" | "quote")
    : "all";

  if (!q) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const dataset = await getStoryDataset();
  const index = buildSearchIndex(dataset.characters, dataset.events, dataset.dialogues, dataset.evidence);
  const raw = index.search(q);
  const filtered = scope === "all" ? raw : raw.filter((item) => item.type === scope);

  return NextResponse.json({ data: filtered.slice(0, 100), total: filtered.length });
}
