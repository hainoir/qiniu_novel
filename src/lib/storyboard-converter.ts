import { stringify } from "yaml";
import { z } from "zod";
import {
  ChatMessage,
  ScriptAIClient,
  createOpenAICompatibleClient,
} from "./ai-client";
import { ConversionError } from "./errors";
import {
  ScriptYaml,
  parseAndValidateScriptYaml,
  scriptYamlSchema,
} from "./script-schema";
import { parseAndValidateStoryboardYaml } from "./storyboard-schema";

const storyboardRequestSchema = z.object({
  script: scriptYamlSchema.optional(),
  script_yaml: z.string().optional(),
});

function parseScriptPayload(payload: unknown) {
  const request = storyboardRequestSchema.safeParse(payload);

  if (!request.success || (!request.data.script && !request.data.script_yaml)) {
    throw new ConversionError(
      "请提供 script 对象或 script_yaml 文本",
      "invalid_request",
      400,
      request.success ? undefined : request.error.flatten(),
    );
  }

  if (request.data.script) {
    return request.data.script;
  }

  return parseAndValidateScriptYaml(request.data.script_yaml ?? "").script;
}

function compactSceneForPrompt(scene: ScriptYaml["scenes"][number]) {
  return {
    id: scene.id,
    location: scene.location,
    time: scene.time,
    mood: scene.mood,
    purpose: scene.purpose,
    characters: scene.characters,
    beats: scene.beats,
    actions: scene.actions,
    dialogue: scene.dialogue,
    visual_summary: scene.visual_summary,
    key_visuals: scene.key_visuals,
    shot_suggestions: scene.shot_suggestions,
  };
}

export function buildStoryboardPrompt(script: ScriptYaml): ChatMessage[] {
  const schemaGuide = `
请把剧本 YAML 拆解为面向 AI 漫剧生产的分镜 YAML，并只输出 YAML。

必须使用以下顶层字段：
- meta: title, format, target_platform, aspect_ratio, visual_style
- characters: id, name, appearance, costume, continuity_notes
- scenes: id, source_scene_id, location, time, mood, shots
- shots: shot_id, duration_seconds, shot_size, camera_angle, camera_movement, composition, subject, action, dialogue_or_voiceover, visual_prompt, negative_prompt

约束：
- meta.format 必须是 ai_comic_drama。
- 默认 target_platform 使用 douyin，aspect_ratio 使用 9:16。
- 每个 source_scene_id 必须引用输入剧本 scenes 中已有的 id。
- 每个剧本 scene 至少拆成 1 个 shot，重要场景建议拆成 2-4 个 shot。
- duration_seconds 建议在 4 到 12 秒之间。
- visual_prompt 要面向视频生成模型，必须包含主体、动作、地点、时间、视觉风格、氛围和镜头语言。
- negative_prompt 用英文逗号分隔，避免 blurry、low quality、distorted hands、extra fingers、watermark、logo 等问题。
- 字段名必须保持英文 snake_case，字段内容使用中文。
- 不要输出 Markdown 代码块，不要解释，只输出 YAML。
`.trim();

  return [
    {
      role: "system",
      content:
        "你是 AI 漫剧分镜导演，擅长把剧本场景拆成可被视频生成模型理解的镜头单元。",
    },
    {
      role: "user",
      content: [
        schemaGuide,
        "剧本信息如下：",
        stringify({
          meta: script.meta,
          characters: script.characters,
          scenes: script.scenes.map(compactSceneForPrompt),
        }),
      ].join("\n\n"),
    },
  ];
}

export async function convertScriptToStoryboard(
  payload: unknown,
  client: ScriptAIClient = createOpenAICompatibleClient(),
) {
  const script = parseScriptPayload(payload);
  const aiContent = await client.generate(buildStoryboardPrompt(script));

  return parseAndValidateStoryboardYaml(
    aiContent,
    script.scenes.map((scene) => scene.id),
  );
}

