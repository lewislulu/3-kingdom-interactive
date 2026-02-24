import Link from "next/link";
import { getStoryDataset } from "@/lib/data";
import { FEEDBACK_ISSUE_URL } from "@/lib/feedback";

export default async function EpiloguePage() {
  const dataset = await getStoryDataset();

  return (
    <main className="epilogue-shell">
      <header>
        <p className="eyebrow">终章</p>
        <h1>司马氏与天下归一</h1>
        <p>将 120 回主线与归晋终局关联展示，形成完整收束。</p>
        <Link href="/story">返回故事主工作台</Link>
        <a href={FEEDBACK_ISSUE_URL} target="_blank" rel="noreferrer">提交反馈</a>
      </header>

      <section className="epilogue-timeline">
        {dataset.epilogue.map((item) => (
          <article key={item.id}>
            <span>#{item.order}</span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <code>{item.linked_event_ids.join(", ")}</code>
          </article>
        ))}
      </section>
    </main>
  );
}
