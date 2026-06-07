"use client";

import {
  BookOpen,
  Copy,
  Download,
  FileText,
  Film,
  Loader2,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ChapterState = {
  id: string;
  title: string;
  content: string;
};

type StageKey = "script" | "storyboard" | "video";

type ConvertResponse = {
  yaml?: string;
  error?: string;
};

type StagePanelProps = {
  title: string;
  subtitle: string;
  value: string;
  placeholder: string;
  filename: string;
  actionLabel: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string;
  rowsClassName?: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
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

function downloadText(value: string, filename: string) {
  if (!value) return;
  const blob = new Blob([value], { type: "application/x-yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StagePanel({
  title,
  subtitle,
  value,
  placeholder,
  filename,
  actionLabel,
  disabled,
  isLoading,
  error,
  rowsClassName = "min-h-[28rem]",
  onChange,
  onGenerate,
}: StagePanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="min-w-0 rounded-md border border-[#d8dde7] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8dde7] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-[#5c6675]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!value}
            onClick={copyValue}
            title="复制 YAML"
            type="button"
          >
            <Copy aria-hidden="true" size={16} />
            {copied ? "已复制" : "复制"}
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d1de] bg-white px-3 text-sm font-medium hover:bg-[#eef2f6] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!value}
            onClick={() => downloadText(value, filename)}
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#16324f] px-4 text-sm font-semibold text-white hover:bg-[#10263d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isLoading}
          onClick={onGenerate}
          type="button"
        >
          {isLoading ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={18} />
          ) : (
            <Sparkles aria-hidden="true" size={18} />
          )}
          {actionLabel}
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
          className={`${rowsClassName} w-full resize-y rounded-md border border-[#c9d1de] bg-[#101418] px-4 py-3 font-mono text-sm leading-6 text-[#eaf0f6] outline-none placeholder:text-[#84919f] focus:border-[#0f766e] focus:ring-2 focus:ring-[#bce8df]`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          value={value}
        />
      </div>
    </section>
  );
}

export function ScriptWorkbench() {
  const [chapters, setChapters] = useState<ChapterState[]>(initialChapters);
  const [scriptYaml, setScriptYaml] = useState("");
  const [storyboardYaml, setStoryboardYaml] = useState("");
  const [videoJobsYaml, setVideoJobsYaml] = useState("");
  const [errors, setErrors] = useState<Record<StageKey, string>>({
    script: "",
    storyboard: "",
    video: "",
  });
  const [loadingStage, setLoadingStage] = useState<StageKey | null>(null);

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

  function setStageError(stage: StageKey, value: string) {
    setErrors((current) => ({ ...current, [stage]: value }));
  }

  function addChapter() {
    setChapters((current) => [...current, newChapter(current.length + 1)]);
  }

  function removeChapter(id: string) {
    setChapters((current) =>
      current.length <= 3
        ? current
        : current.filter((chapter) => chapter.id !== id),
    );
  }

  function loadSample() {
    setChapters(sampleChapters);
    setScriptYaml("");
    setStoryboardYaml("");
    setVideoJobsYaml("");
    setErrors({ script: "", storyboard: "", video: "" });
  }

  async function postYaml(endpoint: string, body: unknown) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ConvertResponse;

    if (!response.ok || !data.yaml) {
      throw new Error(data.error ?? "生成失败");
    }

    return data.yaml;
  }

  async function generateScript() {
    setLoadingStage("script");
    setStageError("script", "");

    const cleanedChapters = chapters
      .filter((chapter) => chapter.content.trim().length > 0)
      .map((chapter, index) => ({
        title: chapter.title.trim() || `第${index + 1}章`,
        content: chapter.content.trim(),
      }));

    try {
      const yaml = await postYaml("/api/convert", {
        chapters: cleanedChapters,
      });
      setScriptYaml(yaml);
      setStoryboardYaml("");
      setVideoJobsYaml("");
      setErrors({ script: "", storyboard: "", video: "" });
    } catch (requestError) {
      setStageError(
        "script",
        requestError instanceof Error ? requestError.message : "剧本生成失败",
      );
    } finally {
      setLoadingStage(null);
    }
  }

  async function generateStoryboard() {
    setLoadingStage("storyboard");
    setStageError("storyboard", "");

    try {
      const yaml = await postYaml("/api/storyboard", {
        script_yaml: scriptYaml,
      });
      setStoryboardYaml(yaml);
      setVideoJobsYaml("");
      setStageError("video", "");
    } catch (requestError) {
      setStageError(
        "storyboard",
        requestError instanceof Error ? requestError.message : "分镜生成失败",
      );
    } finally {
      setLoadingStage(null);
    }
  }

  async function generateVideoJobs() {
    setLoadingStage("video");
    setStageError("video", "");

    try {
      const yaml = await postYaml("/api/video-jobs", {
        storyboard_yaml: storyboardYaml,
        provider: "generic",
      });
      setVideoJobsYaml(yaml);
    } catch (requestError) {
      setStageError(
        "video",
        requestError instanceof Error
          ? requestError.message
          : "视频任务生成失败",
      );
    } finally {
      setLoadingStage(null);
    }
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
                小说 · 剧本 · 分镜 · 视频任务
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

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.25fr)]">
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

        <div className="grid min-w-0 gap-4">
          <div className="rounded-md border border-[#d8dde7] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#4c5665]">
              <span className="inline-flex items-center gap-2 font-medium text-[#16324f]">
                <WandSparkles aria-hidden="true" size={16} />
                小说章节
              </span>
              <span>→</span>
              <span>剧本 YAML</span>
              <span>→</span>
              <span>分镜 YAML</span>
              <span>→</span>
              <span className="inline-flex items-center gap-2">
                <Film aria-hidden="true" size={16} />
                video_generation_jobs
              </span>
            </div>
          </div>

          <StagePanel
            actionLabel="生成剧本初稿"
            error={errors.script}
            filename="script-draft.yaml"
            isLoading={loadingStage === "script"}
            onChange={setScriptYaml}
            onGenerate={generateScript}
            placeholder="剧本 YAML 输出"
            subtitle="小说章节 -> 结构化剧本"
            title="剧本 YAML"
            value={scriptYaml}
          />

          <StagePanel
            actionLabel="生成分镜"
            disabled={!scriptYaml}
            error={errors.storyboard}
            filename="storyboard.yaml"
            isLoading={loadingStage === "storyboard"}
            onChange={setStoryboardYaml}
            onGenerate={generateStoryboard}
            placeholder="分镜 YAML 输出"
            rowsClassName="min-h-[24rem]"
            subtitle="剧本 YAML -> AI 漫剧分镜"
            title="分镜 YAML"
            value={storyboardYaml}
          />

          <StagePanel
            actionLabel="生成视频任务"
            disabled={!storyboardYaml}
            error={errors.video}
            filename="video-jobs.yaml"
            isLoading={loadingStage === "video"}
            onChange={setVideoJobsYaml}
            onGenerate={generateVideoJobs}
            placeholder="video_generation_jobs YAML 输出"
            rowsClassName="min-h-[24rem]"
            subtitle="分镜 YAML -> 可投递视频任务"
            title="视频任务 YAML"
            value={videoJobsYaml}
          />
        </div>
      </main>
    </div>
  );
}

