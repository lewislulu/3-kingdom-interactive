import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三国演义全量故事线系统",
  description: "120回主线 + 归晋终章，以人物轨迹与证据段落重构全书叙事。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
