"use client";

import { useMemo, useState } from "react";
import type { StoryDataset } from "@sgyy/schema";
import { buildSearchIndex } from "@/lib/search";
import { FEEDBACK_ISSUE_URL } from "@/lib/feedback";

type SearchWorkbenchProps = {
  dataset: StoryDataset;
};

export function SearchWorkbench({ dataset }: SearchWorkbenchProps) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "character" | "event" | "quote">("all");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const index = buildSearchIndex(dataset.characters, dataset.events, dataset.dialogues, dataset.evidence);
    const found = index.search(q).slice(0, 60);
    return scope === "all" ? found : found.filter((item) => item.type === scope);
  }, [dataset.characters, dataset.dialogues, dataset.evidence, dataset.events, q, scope]);

  return (
    <main className="search-shell">
      <header>
        <h1>全局搜索</h1>
        <p>支持人物、事件与原文摘录定位。</p>
        <a className="feedback-link" href={FEEDBACK_ISSUE_URL} target="_blank" rel="noreferrer">
          提交反馈
        </a>
      </header>
      <section className="search-controls">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="输入关键字，例如：赤壁 / 诸葛亮 / 空城" />
        <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
          <option value="all">全部</option>
          <option value="character">人物</option>
          <option value="event">事件</option>
          <option value="quote">摘录</option>
        </select>
      </section>
      <section className="search-list">
        {results.map((item) => (
          <article key={item.id}>
            <span>{item.type}</span>
            <h3>{item.title}</h3>
            <p>第{item.chapter}回</p>
            <code>{item.ref_id}</code>
          </article>
        ))}
      </section>
    </main>
  );
}
