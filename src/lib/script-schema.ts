import { parseDocument, stringify } from "yaml";
import { z } from "zod";
import { ConversionError } from "./errors";

export const chapterInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "章节标题不能为空")
    .max(80, "章节标题不能超过 80 个字符"),
  content: z
    .string()
    .trim()
    .min(1, "章节正文不能为空")
    .max(20000, "单个章节正文不能超过 20000 个字符"),
});

export const convertRequestSchema = z.object({
  chapters: z
    .array(chapterInputSchema)
    .min(3, "至少提供 3 个章节")
    .max(8, "一次最多转换 8 个章节，建议拆分后再生成"),
});

export const scriptYamlSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    original_type: z.string().min(1),
    target_format: z.string().min(1),
    synopsis: z.string().min(1),
    tone: z.string().min(1),
  }),
  source_chapters: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        key_events: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(3),
  characters: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        role: z.string().min(1),
        motivation: z.string().min(1),
        traits: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  scenes: z
    .array(
      z.object({
        id: z.string().min(1),
        source_chapter_ids: z.array(z.string().min(1)).min(1),
        location: z.string().min(1),
        time: z.string().min(1),
        purpose: z.string().min(1),
        characters: z.array(z.string().min(1)).min(1),
        beats: z.array(z.string().min(1)).min(1),
        actions: z
          .array(
            z.object({
              character: z.string().optional(),
              description: z.string().min(1),
              camera: z.string().optional(),
            }),
          )
          .min(1),
        dialogue: z.array(
          z.object({
            character: z.string().min(1),
            line: z.string().min(1),
            emotion: z.string().optional(),
            subtext: z.string().optional(),
          }),
        ),
        mood: z.string().min(1),
        transition: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  revision_notes: z.array(z.string().min(1)).default([]),
});

export type ChapterInput = z.infer<typeof chapterInputSchema>;
export type ConvertRequest = z.infer<typeof convertRequestSchema>;
export type ScriptYaml = z.infer<typeof scriptYamlSchema>;

export function extractYamlContent(rawContent: string) {
  const fenced = rawContent.match(/```(?:ya?ml)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? rawContent).trim();
}

export function parseAndValidateScriptYaml(rawContent: string) {
  const yamlText = extractYamlContent(rawContent);
  const document = parseDocument(yamlText, { prettyErrors: false });

  if (document.errors.length > 0) {
    throw new ConversionError(
      "AI 返回的内容不是合法 YAML",
      "invalid_yaml",
      502,
      document.errors.map((error) => error.message),
    );
  }

  const parsed = document.toJSON();
  const result = scriptYamlSchema.safeParse(parsed);

  if (!result.success) {
    throw new ConversionError(
      "AI 返回的 YAML 不符合剧本 Schema",
      "invalid_schema",
      502,
      result.error.flatten(),
    );
  }

  const chapterIds = new Set(
    result.data.source_chapters.map((chapter) => chapter.id),
  );
  const missingRefs = result.data.scenes.flatMap((scene) =>
    scene.source_chapter_ids
      .filter((chapterId) => !chapterIds.has(chapterId))
      .map((chapterId) => `${scene.id}:${chapterId}`),
  );

  if (missingRefs.length > 0) {
    throw new ConversionError(
      "AI 返回的场景引用了不存在的来源章节",
      "invalid_schema",
      502,
      missingRefs,
    );
  }

  return {
    script: result.data,
    yaml: stringify(result.data, { lineWidth: 0 }).trim(),
  };
}
