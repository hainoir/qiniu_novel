"use client";

import {
  BookOpen,
  Copy,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ChapterState = {
  id: string;
  title: string;
  content: string;
};

type ConvertResponse = {
  yaml?: string;
  error?: string;
};

const initialChapters: ChapterState[] = [
  { id: "chapter-1", title: "第一章", content: "" },
  { id: "chapter-2", title: "第二章", content: "" },
  { id: "chapter-3", title: "第三章", content: "" },
];

const sampleChapters: ChapterState[] = [
  {
    id: "chapter-1",
    title: "第一章 雨夜来信",
    content:
      "暴雨把旧车站的玻璃冲得发白。林澈在最后一班车离站后收到一封没有署名的信，信封里夹着姐姐林岚失踪前的照片。照片背面写着：想知道真相，就去地下档案室。",
  },
  {
    id: "chapter-2",
    title: "第二章 钥匙编号",
    content:
      "林澈回到家中，发现信封底部藏着一把黄铜钥匙。钥匙柄上刻着 0719，这正是姐姐失踪那天的日期。记者许晚认出这串编号属于城北旧档案馆的地下库房。",
  },
  {
    id: "chapter-3",
    title: "第三章 地下档案室",
    content:
      "两人潜入旧档案馆，地下室里只剩应急灯闪烁。林澈打开 0719 号柜，里面不是姐姐的资料，而是一份被烧毁过的火灾调查报告。报告最后一页写着：林岚并非失踪。",
  },
];

function newChapter(index: number): ChapterState {
  return {
    id: `chapter-${Date.now()}-${index}`,
    title: `第${index}章`,
    content: "",
  };
}

export function ScriptWorkbench() {
  const [chapters, setChapters] = useState<ChapterState[]>(initialChapters);
  const [yaml, setYaml] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const filled = chapters.filter(
      (chapter) => chapter.content.trim().length > 0,
    ).length;
    const chars = chapters.reduce(
      (total, chapter) => total + chapter.content.trim().length,
      0,
    );
    return { filled, chars };
  }, [chapters]);

  function updateChapter(
    id: string,
    field: "title" | "content",
    value: string,
  ) {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter,
      ),
    );
  }

  function addChapter() {
    setChapters((current) => [...current, newChapter(current.length + 1)]);
  }

  function removeChapter(id: string) {
    setChapters((current) =>
      current.length <= 3 ? current : current.filter((chapter) => chapter.id !== id),
    );
  }

  function loadSample() {
    setChapters(sampleChapters);
    setYaml("");
    setError("");
  }

  async function generateScript() {
    setIsLoading(true);
    setError("");
    setCopied(false);

    const cleanedChapters = chapters
      .filter((chapter) => chapter.content.trim().length > 0)
      .map((chapter, index) => ({
        title: chapter.title.trim() || `第${index + 1}章`,
        content: chapter.content.trim(),
      }));

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: cleanedChapters }),
      });
      const data = (await response.json()) as ConvertResponse;

      if (!response.ok || !data.yaml) {
        throw new Error(data.error ?? "剧本生成失败");
      }

      setYaml(data.yaml);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "剧本生成失败",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function copyYaml() {
    if (!yaml) return;
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadYaml() {
    if (!yaml) return;
    const blob = new Blob([yaml], { type: "application/x-yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "script-draft.yaml";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#15171a]">
      <header className="border-b border-[#d8dde7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#16324f] text-white">
              <BookOpen aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">
                AI 小说转剧本工具
              </h1>
              <p className="text-sm text-[#5c6675]">
                题目三 · 结构化 YAML 剧本初稿
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6]"
              href="/schema"
            >
              <FileText aria-hidden="true" size={17} />
              Schema
            </Link>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6]"
              onClick={loadSample}
              title="载入示例文本"
              type="button"
            >
              <RefreshCcw aria-hidden="true" size={17} />
              示例
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="min-w-0 rounded-md border border-[#d8dde7] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8dde7] px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">小说章节</h2>
              <p className="text-sm text-[#5c6675]">
                已填写 {stats.filled} 章 · {stats.chars} 字
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#0f766e] px-3 text-sm font-medium text-white hover:bg-[#0d665f]"
              onClick={addChapter}
              title="新增章节"
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              新增章节
            </button>
          </div>

          <div className="grid gap-3 p-4">
            {chapters.map((chapter, index) => (
              <article
                className="rounded-md border border-[#d8dde7] bg-[#fbfcfe]"
                key={chapter.id}
              >
                <div className="flex items-center gap-2 border-b border-[#e3e7ee] px-3 py-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#e8eef7] text-sm font-semibold text-[#16324f]">
                    {index + 1}
                  </span>
                  <input
                    className="h-9 min-w-0 flex-1 rounded-md border border-[#c9d1de] bg-white px-3 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#bce8df]"
                    onChange={(event) =>
                      updateChapter(chapter.id, "title", event.target.value)
                    }
                    value={chapter.title}
                  />
                  <button
                    aria-label="删除章节"
                    className="flex size-9 items-center justify-center rounded-md border border-[#c9d1de] bg-white text-[#6b2634] hover:bg-[#fff0f2] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={chapters.length <= 3}
                    onClick={() => removeChapter(chapter.id)}
                    title="删除章节"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
                <textarea
                  className="min-h-44 w-full resize-y rounded-b-md bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#8a94a3] focus:bg-white"
                  onChange={(event) =>
                    updateChapter(chapter.id, "content", event.target.value)
                  }
                  placeholder={`粘贴${chapter.title || `第${index + 1}章`}正文`}
                  value={chapter.content}
                />
              </article>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-[#d8dde7] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8dde7] px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">剧本 YAML</h2>
              <p className="text-sm text-[#5c6675]">
                可编辑 · 可复制 · 可下载
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!yaml}
                onClick={copyYaml}
                title="复制 YAML"
                type="button"
              >
                <Copy aria-hidden="true" size={16} />
                {copied ? "已复制" : "复制"}
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!yaml}
                onClick={downloadYaml}
                title="下载 YAML"
                type="button"
              >
                <Download aria-hidden="true" size={16} />
                下载
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#16324f] px-4 text-sm font-semibold text-white hover:bg-[#10263d] disabled:cursor-wait disabled:opacity-70"
              disabled={isLoading}
              onClick={generateScript}
              type="button"
            >
              {isLoading ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              ) : (
                <Sparkles aria-hidden="true" size={18} />
              )}
              生成剧本初稿
            </button>

            {error ? (
              <div
                className="rounded-md border border-[#f0b8bd] bg-[#fff5f5] px-3 py-2 text-sm text-[#7b2430]"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <textarea
              className="min-h-[34rem] w-full resize-y rounded-md border border-[#c9d1de] bg-[#101418] px-4 py-3 font-mono text-sm leading-6 text-[#eaf0f6] outline-none placeholder:text-[#84919f] focus:border-[#0f766e] focus:ring-2 focus:ring-[#bce8df]"
              onChange={(event) => setYaml(event.target.value)}
              placeholder="YAML 输出"
              spellCheck={false}
              value={yaml}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
