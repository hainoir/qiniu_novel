import Link from "next/link";

const fields = [
  ["meta", "作品标题、原始类型、目标格式、概要、整体语气"],
  ["source_chapters", "来源章节摘要和关键事件，支撑改编可追溯"],
  ["characters", "角色表，包含职责、动机和性格特征"],
  ["scenes", "剧本场景，包含场景目标、动作、对白和来源章节"],
  ["revision_notes", "给作者的后续打磨建议"],
];

export default function SchemaPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-6 text-[#15171a] sm:px-6">
      <div className="mx-auto max-w-4xl rounded-md border border-[#d8dde7] bg-white">
        <div className="border-b border-[#d8dde7] px-5 py-4">
          <Link
            className="text-sm font-medium text-[#0f766e] hover:text-[#0b5d56]"
            href="/"
          >
            返回工具
          </Link>
          <h1 className="mt-3 text-2xl font-semibold">
            剧本 YAML Schema
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#5c6675]">
            仓库文档位于 docs/script-yaml-schema.md。
          </p>
        </div>

        <div className="grid gap-4 p-5">
          {fields.map(([name, description]) => (
            <section
              className="rounded-md border border-[#d8dde7] bg-[#fbfcfe] p-4"
              key={name}
            >
              <h2 className="font-mono text-sm font-semibold text-[#16324f]">
                {name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4c5665]">
                {description}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
