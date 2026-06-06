import {
  ChapterInput,
  convertRequestSchema,
  parseAndValidateScriptYaml,
} from "./script-schema";
import {
  ChatMessage,
  ScriptAIClient,
  createOpenAICompatibleClient,
} from "./ai-client";
import { ConversionError } from "./errors";

function formatChapterForPrompt(chapter: ChapterInput, index: number) {
  return [
    `## chapter_${index + 1}: ${chapter.title}`,
    chapter.content.trim(),
  ].join("\n");
}

export function buildScriptPrompt(chapters: ChapterInput[]): ChatMessage[] {
  const schemaGuide = `
请把小说章节改编为结构化剧本初稿，并只输出 YAML。

必须使用以下顶层字段：
- meta: title, original_type, target_format, synopsis, tone
- source_chapters: 每章 id, title, summary, key_events
- characters: id, name, role, motivation, traits
- scenes: id, source_chapter_ids, location, time, purpose, characters, beats, actions, dialogue, mood, transition, notes
- revision_notes: 给作者的后续打磨建议

约束：
- source_chapters 至少包含 3 个章节。
- 每个 scene.source_chapter_ids 必须引用 source_chapters 中已有的 id。
- actions 使用对象数组，每项至少有 description。
- dialogue 使用对象数组，每项至少有 character 与 line。
- 字段名必须保持英文 snake_case，字段内容使用中文。
- 不要输出 Markdown 代码块，不要解释，只输出 YAML。
`.trim();

  return [
    {
      role: "system",
      content:
        "你是资深剧本改编顾问，擅长把小说情节拆成可拍摄、可排练、可编辑的剧本 YAML。",
    },
    {
      role: "user",
      content: [
        schemaGuide,
        "小说章节如下：",
        chapters.map(formatChapterForPrompt).join("\n\n"),
      ].join("\n\n"),
    },
  ];
}

export async function convertNovelToScript(
  payload: unknown,
  client: ScriptAIClient = createOpenAICompatibleClient(),
) {
  const request = convertRequestSchema.safeParse(payload);

  if (!request.success) {
    throw new ConversionError(
      "小说章节输入不符合要求",
      "invalid_request",
      400,
      request.error.flatten(),
    );
  }

  const aiContent = await client.generate(buildScriptPrompt(request.data.chapters));
  return parseAndValidateScriptYaml(aiContent);
}

export { ConversionError };
