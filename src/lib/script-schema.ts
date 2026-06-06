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

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function optionalString(value: unknown) {
  const normalized = stringValue(value);
  return normalized.length > 0 ? normalized : undefined;
}

function arrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
}

function stringArray(value: unknown) {
  return arrayValue(value)
    .map((item) => {
      if (isRecord(item)) {
        return (
          stringValue(item.name) ||
          stringValue(item.title) ||
          stringValue(item.id) ||
          stringValue(item.description) ||
          stringValue(item.line)
        );
      }

      return stringValue(item);
    })
    .filter((item) => item.length > 0);
}

function normalizeAction(action: unknown) {
  if (isRecord(action)) {
    return {
      character: optionalString(action.character ?? action.name ?? action.actor),
      description:
        stringValue(action.description) ||
        stringValue(action.action) ||
        stringValue(action.text) ||
        stringValue(action.content) ||
        "待补充动作",
      camera: optionalString(action.camera ?? action.shot),
    };
  }

  return {
    description: stringValue(action) || "待补充动作",
  };
}

function normalizeDialogue(line: unknown) {
  if (isRecord(line)) {
    return {
      character:
        stringValue(line.character) ||
        stringValue(line.speaker) ||
        stringValue(line.name) ||
        "旁白",
      line:
        stringValue(line.line) ||
        stringValue(line.text) ||
        stringValue(line.content) ||
        stringValue(line.dialogue) ||
        "待补充台词",
      emotion: optionalString(line.emotion ?? line.mood),
      subtext: optionalString(line.subtext),
    };
  }

  const text = stringValue(line);
  const match = text.match(/^([^:：]{1,20})[:：]\s*(.+)$/);

  return {
    character: match?.[1]?.trim() || "旁白",
    line: match?.[2]?.trim() || text || "待补充台词",
  };
}

function normalizeScriptYaml(parsed: unknown) {
  if (!isRecord(parsed)) {
    return parsed;
  }

  const rawMeta = isRecord(parsed.meta) ? parsed.meta : {};
  const rawSourceChapters =
    parsed.source_chapters ?? parsed.chapters ?? parsed.sourceChapters;
  const source_chapters = arrayValue(rawSourceChapters).map((chapter, index) => {
    const rawChapter: AnyRecord = isRecord(chapter)
      ? chapter
      : { summary: chapter };
    const title =
      stringValue(rawChapter.title) ||
      stringValue(rawChapter.name) ||
      `第 ${index + 1} 章`;
    const summary =
      stringValue(rawChapter.summary) ||
      stringValue(rawChapter.synopsis) ||
      title;
    const keyEvents = stringArray(
      rawChapter.key_events ?? rawChapter.keyEvents ?? rawChapter.events,
    );

    return {
      id:
        stringValue(rawChapter.id) ||
        stringValue(rawChapter.chapter_id) ||
        `chapter_${index + 1}`,
      title,
      summary,
      key_events: keyEvents.length > 0 ? keyEvents : [summary],
    };
  });

  const sourceChapterIds = source_chapters.map((chapter) => chapter.id);
  const rawScenes = arrayValue(parsed.scenes);
  const rawCharacters =
    parsed.characters ?? parsed.character_list ?? parsed.characterList;

  const scenes = rawScenes.map((scene, index) => {
    const rawScene: AnyRecord = isRecord(scene) ? scene : { purpose: scene };
    const purpose =
      stringValue(rawScene.purpose) ||
      stringValue(rawScene.summary) ||
      stringValue(rawScene.description) ||
      "推进剧情";
    const beats = stringArray(
      rawScene.beats ?? rawScene.key_events ?? rawScene.plot_points,
    );
    const sourceRefs = stringArray(
      rawScene.source_chapter_ids ??
        rawScene.sourceChapters ??
        rawScene.source_chapters ??
        rawScene.chapter_ids ??
        rawScene.chapter_id ??
        rawScene.source_chapter,
    );
    const actions = arrayValue(rawScene.actions ?? rawScene.action).map(
      normalizeAction,
    );
    const dialogue = arrayValue(
      rawScene.dialogue ?? rawScene.dialogues ?? rawScene.lines,
    ).map(normalizeDialogue);
    const sceneCharacters = Array.from(
      new Set([
        ...stringArray(rawScene.characters ?? rawScene.character),
        ...actions
          .map((action) => action.character)
          .filter((character): character is string => Boolean(character)),
        ...dialogue.map((item) => item.character),
      ]),
    );

    return {
      id: stringValue(rawScene.id) || `scene_${index + 1}`,
      source_chapter_ids:
        sourceRefs.length > 0 ? sourceRefs : sourceChapterIds,
      location:
        stringValue(rawScene.location) ||
        stringValue(rawScene.setting) ||
        "未标注地点",
      time:
        stringValue(rawScene.time) ||
        stringValue(rawScene.time_of_day) ||
        "未标注时间",
      purpose,
      characters:
        sceneCharacters.length > 0 ? sceneCharacters : ["未标注角色"],
      beats: beats.length > 0 ? beats : [purpose],
      actions: actions.length > 0 ? actions : [{ description: purpose }],
      dialogue,
      mood:
        stringValue(rawScene.mood) ||
        stringValue(rawScene.tone) ||
        stringValue(rawMeta.tone) ||
        "待定",
      transition: optionalString(rawScene.transition),
      notes: optionalString(rawScene.notes ?? rawScene.note),
    };
  });

  const characters = arrayValue(rawCharacters).map((character, index) => {
    const rawCharacter: AnyRecord = isRecord(character)
      ? character
      : { name: character };
    const name =
      stringValue(rawCharacter.name) ||
      stringValue(rawCharacter.id) ||
      `角色${index + 1}`;
    const traits = stringArray(rawCharacter.traits ?? rawCharacter.tags);

    return {
      id:
        stringValue(rawCharacter.id) ||
        name.toLowerCase().replace(/\s+/g, "_") ||
        `character_${index + 1}`,
      name,
      role: stringValue(rawCharacter.role) || "未标注角色职责",
      motivation:
        stringValue(rawCharacter.motivation) ||
        stringValue(rawCharacter.goal) ||
        "待补充动机",
      traits: traits.length > 0 ? traits : ["待补充特征"],
    };
  });

  const sceneCharacterNames = Array.from(
    new Set(scenes.flatMap((scene) => scene.characters)),
  );
  const fallbackCharacters = sceneCharacterNames.map((name, index) => ({
    id: `character_${index + 1}`,
    name,
    role: "未标注角色职责",
    motivation: "待补充动机",
    traits: ["待补充特征"],
  }));

  return {
    ...parsed,
    meta: {
      title:
        stringValue(rawMeta.title) ||
        stringValue(rawMeta.name) ||
        "未命名剧本",
      original_type: stringValue(rawMeta.original_type) || "novel",
      target_format: stringValue(rawMeta.target_format) || "screenplay_yaml",
      synopsis:
        stringValue(rawMeta.synopsis) ||
        stringValue(rawMeta.summary) ||
        "待补充概要",
      tone: stringValue(rawMeta.tone) || stringValue(rawMeta.style) || "待定",
    },
    source_chapters,
    characters: characters.length > 0 ? characters : fallbackCharacters,
    scenes,
    revision_notes: stringArray(
      parsed.revision_notes ?? parsed.revisionNotes ?? parsed.notes,
    ),
  };
}

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

  const parsed = normalizeScriptYaml(document.toJSON());
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
