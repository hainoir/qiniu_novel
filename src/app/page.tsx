export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#15171a] sm:px-6">
      <section className="mx-auto max-w-4xl rounded-md border border-[#d8dde7] bg-white p-6">
        <p className="text-sm font-medium text-[#0f766e]">题目三</p>
        <h1 className="mt-3 text-3xl font-semibold">AI 小说转剧本工具</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#4c5665]">
          本项目用于将 3 个章节以上的小说文本转换为结构化 YAML
          剧本初稿。当前 PR 初始化 Next.js 项目、运行文档和基础页面，后续
          PR 会逐步加入 Schema 文档、AI 转换 API 和完整创作界面。
        </p>
      </section>
    </main>
  );
}
