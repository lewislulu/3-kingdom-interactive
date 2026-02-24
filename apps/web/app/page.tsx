import Link from "next/link";
import { PrologueScene } from "@/lib/three/prologue-scene";
import { getDataVersionMeta } from "@/lib/data";
import { FEEDBACK_ISSUE_URL } from "@/lib/feedback";

export default async function ProloguePage() {
  const meta = await getDataVersionMeta();

  return (
    <main className="prologue-v2">
      <PrologueScene />
      <section className="prologue-v2-card">
        <p className="eyebrow">汉末卷首 · 全量重构版</p>
        <h1>三国演义人物命运时空图谱</h1>
        <p>
          从黄巾起义到三分归晋，按 120 回主线与证据段落重建故事网络。
          当前数据：{meta.chapters}回 / {meta.events}事件 / {meta.characters}人物。
        </p>
        <div className="actions">
          <Link href="/story">进入故事主工作台</Link>
          <Link href="/epilogue">查看归晋终章</Link>
          <a href={FEEDBACK_ISSUE_URL} target="_blank" rel="noreferrer">提交反馈</a>
        </div>
      </section>
    </main>
  );
}
