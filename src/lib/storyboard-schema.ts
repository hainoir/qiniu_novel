import { parseDocument, stringify } from "yaml";
import { z } from "zod";
import { ConversionError } from "./errors";

export const aspectRatioSchema = z.enum(["9:16", "16:9", "1:1"]);
export const targetPlatformSchema = z.enum([
  "douyin",
  "kuaishou",
  "bilibili",
  "generic",
]);
export const shotSizeSchema = z.enum([
  "close_up",
  "medium_shot",
  "wide_shot",
  "extreme_close_up",
]);
export const cameraAngleSchema = z.enum([
  "eye_level",
  "high_angle",
  "low_angle",
  "over_the_shoulder",
]);
export const cameraMovementSchema = z.enum([
  "static",
  "push_in",
  "pull_out",
  "pan",
  "tilt",
  "tracking",
]);

export const storyboardYamlSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    format: z.literal("ai_comic_drama"),
    target_platform: targetPlatformSchema,
    aspect_ratio: aspectRatioSchema,
    visual_style: z.string().min(1),
  }),
  characters: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        appearance: z.string().min(1),
        costume: z.string().min(1),
        continuity_notes: z.string().min(1),
      }),
    )
    .min(1),
  scenes: z
    .array(
      z.object({
        id: z.string().min(1),
        source_scene_id: z.string().min(1),
        location: z.string().min(1),
        time: z.string().min(1),
        mood: z.string().min(1),
        shots: z
          .array(
            z.object({
              shot_id: z.string().min(1),
              duration_seconds: z.number().positive().max(12),
              shot_size: shotSizeSchema,
              camera_angle: cameraAngleSchema,
              camera_movement: cameraMovementSchema,
              composition: z.string().min(1),
              subject: z.string().min(1),
              action: z.string().min(1),
              dialogue_or_voiceover: z.string(),
              visual_prompt: z.string().min(1),
              negative_prompt: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type StoryboardYaml = z.infer<typeof storyboardYamlSchema>;

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

function arrayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
}

function enumValue<T extends readonly [string, ...string[]]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
) {
  const normalized = stringValue(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeDuration(value: unknown) {
  const duration = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(duration) || duration <= 0) {
    return 8;
  }

  return Math.min(Math.max(duration, 1), 12);
}

function normalizeShot(shot: unknown, index: number, scene: AnyRecord) {
  const rawShot: AnyRecord = isRecord(shot) ? shot : { action: shot };
  const subject =
    stringValue(rawShot.subject) ||
    stringValue(rawShot.character) ||
    stringValue(scene.subject) ||
    "主要角色";
  const action =
    stringValue(rawShot.action) ||
    stringValue(rawShot.description) ||
    stringValue(rawShot.summary) ||
    "推进剧情动作";
  const dialogue =
    stringValue(rawShot.dialogue_or_voiceover) ||
    stringValue(rawShot.dialogue) ||
    stringValue(rawShot.voiceover);

  return {
    shot_id:
      stringValue(rawShot.shot_id) ||
      stringValue(rawShot.id) ||
      `shot_${String(index + 1).padStart(3, "0")}`,
    duration_seconds: normalizeDuration(
      rawShot.duration_seconds ?? rawShot.duration ?? rawShot.seconds,
    ),
    shot_size: enumValue(
      rawShot.shot_size ?? rawShot.size,
      ["close_up", "medium_shot", "wide_shot", "extreme_close_up"] as const,
      "medium_shot",
    ),
    camera_angle: enumValue(
      rawShot.camera_angle ?? rawShot.angle,
      ["eye_level", "high_angle", "low_angle", "over_the_shoulder"] as const,
      "eye_level",
    ),
    camera_movement: enumValue(
      rawShot.camera_movement ?? rawShot.movement,
      ["static", "push_in", "pull_out", "pan", "tilt", "tracking"] as const,
      "static",
    ),
    composition:
      stringValue(rawShot.composition) || `${subject} 位于画面中心，突出动作。`,
    subject,
    action,
    dialogue_or_voiceover: dialogue,
    visual_prompt:
      stringValue(rawShot.visual_prompt) ||
      stringValue(rawShot.prompt) ||
      `${subject} ${action}，${stringValue(scene.location)}，${stringValue(scene.mood)}，AI 漫剧风格。`,
    negative_prompt:
      stringValue(rawShot.negative_prompt) ||
      "blurry, low quality, distorted hands, extra fingers, watermark, logo",
  };
}

function normalizeStoryboardYaml(parsed: unknown) {
  if (!isRecord(parsed)) {
    return parsed;
  }

  const rawMeta = isRecord(parsed.meta) ? parsed.meta : {};
  const scenes = arrayValue(parsed.scenes).map((scene, sceneIndex) => {
    const rawScene: AnyRecord = isRecord(scene) ? scene : { mood: scene };

    return {
      id:
        stringValue(rawScene.id) ||
        `storyboard_scene_${String(sceneIndex + 1).padStart(2, "0")}`,
      source_scene_id:
        stringValue(rawScene.source_scene_id) ||
        stringValue(rawScene.sourceSceneId) ||
        stringValue(rawScene.scene_id) ||
        `scene_${sceneIndex + 1}`,
      location: stringValue(rawScene.location) || "未标注地点",
      time: stringValue(rawScene.time) || "未标注时间",
      mood: stringValue(rawScene.mood) || stringValue(rawMeta.tone) || "待定",
      shots: arrayValue(rawScene.shots ?? rawScene.storyboards).map(
        (shot, shotIndex) => normalizeShot(shot, shotIndex, rawScene),
      ),
    };
  });

  const characters = arrayValue(parsed.characters).map((character, index) => {
    const rawCharacter: AnyRecord = isRecord(character)
      ? character
      : { name: character };
    const name =
      stringValue(rawCharacter.name) ||
      stringValue(rawCharacter.id) ||
      `角色${index + 1}`;

    return {
      id:
        stringValue(rawCharacter.id) ||
        name.toLowerCase().replace(/\s+/g, "_") ||
        `character_${index + 1}`,
      name,
      appearance:
        stringValue(rawCharacter.appearance) ||
        stringValue(rawCharacter.look) ||
        "待补充外观",
      costume:
        stringValue(rawCharacter.costume) ||
        stringValue(rawCharacter.clothing) ||
        "待补充服装",
      continuity_notes:
        stringValue(rawCharacter.continuity_notes) ||
        stringValue(rawCharacter.continuityNotes) ||
        `${name} 在所有镜头中保持外观和服装一致。`,
    };
  });

  return {
    ...parsed,
    meta: {
      title:
        stringValue(rawMeta.title) ||
        stringValue(rawMeta.name) ||
        "未命名分镜",
      format: "ai_comic_drama",
      target_platform: enumValue(
        rawMeta.target_platform ?? rawMeta.platform,
        ["douyin", "kuaishou", "bilibili", "generic"] as const,
        "douyin",
      ),
      aspect_ratio: enumValue(
        rawMeta.aspect_ratio ?? rawMeta.ratio,
        ["9:16", "16:9", "1:1"] as const,
        "9:16",
      ),
      visual_style:
        stringValue(rawMeta.visual_style) ||
        stringValue(rawMeta.style) ||
        "2D anime cinematic comic drama",
    },
    characters:
      characters.length > 0
        ? characters
        : [
            {
              id: "character_1",
              name: "主要角色",
              appearance: "待补充外观",
              costume: "待补充服装",
              continuity_notes: "保持角色外观和服装一致。",
            },
          ],
    scenes,
  };
}

export function parseAndValidateStoryboardYaml(
  rawContent: string,
  sourceSceneIds?: string[],
) {
  const document = parseDocument(rawContent, { prettyErrors: false });

  if (document.errors.length > 0) {
    throw new ConversionError(
      "AI 返回的分镜内容不是合法 YAML",
      "invalid_yaml",
      502,
      document.errors.map((error) => error.message),
    );
  }

  const normalized = normalizeStoryboardYaml(document.toJSON());
  const result = storyboardYamlSchema.safeParse(normalized);

  if (!result.success) {
    throw new ConversionError(
      "AI 返回的分镜 YAML 不符合 Schema",
      "invalid_schema",
      502,
      result.error.flatten(),
    );
  }

  if (sourceSceneIds?.length) {
    const sourceIds = new Set(sourceSceneIds);
    const missingRefs = result.data.scenes
      .filter((scene) => !sourceIds.has(scene.source_scene_id))
      .map((scene) => `${scene.id}:${scene.source_scene_id}`);

    if (missingRefs.length > 0) {
      throw new ConversionError(
        "AI 返回的分镜引用了不存在的剧本场景",
        "invalid_schema",
        502,
        missingRefs,
      );
    }
  }

  return {
    storyboard: result.data,
    yaml: stringify(result.data, { lineWidth: 0 }).trim(),
  };
}

