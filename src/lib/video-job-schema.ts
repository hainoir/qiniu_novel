import { parseDocument, stringify } from "yaml";
import { z } from "zod";
import { ConversionError } from "./errors";
import { aspectRatioSchema } from "./storyboard-schema";

export const videoProviderSchema = z.enum([
  "generic",
  "sora",
  "veo",
  "runway",
  "kling",
]);

export const referenceAssetSchema = z.object({
  type: z.enum(["image", "video", "character", "style"]),
  id: z.string().min(1),
  url: z.string(),
  role: z.enum(["first_frame", "character_reference", "style_reference"]),
});

export const videoGenerationJobSchema = z.object({
  job_id: z.string().min(1),
  provider: videoProviderSchema,
  model: z.string().min(1),
  source_shot_id: z.string().min(1),
  prompt: z.string().min(1),
  negative_prompt: z.string().min(1),
  duration_seconds: z.number().positive().max(12),
  aspect_ratio: aspectRatioSchema,
  resolution: z.string().min(1),
  seed: z.number().nullable(),
  reference_assets: z.array(referenceAssetSchema),
  audio: z.object({
    dialogue: z.string(),
    voice_style: z.string(),
    sfx: z.string(),
    music_mood: z.string(),
  }),
  status: z.enum(["draft", "ready", "queued", "in_progress", "completed", "failed"]),
});

export const videoJobsYamlSchema = z.object({
  video_generation_jobs: z.array(videoGenerationJobSchema).min(1),
});

export type VideoProvider = z.infer<typeof videoProviderSchema>;
export type VideoJobsYaml = z.infer<typeof videoJobsYamlSchema>;

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

function normalizeReferenceAsset(asset: unknown, index: number) {
  const rawAsset: AnyRecord = isRecord(asset) ? asset : { id: asset };

  return {
    type: enumValue(
      rawAsset.type,
      ["image", "video", "character", "style"] as const,
      "character",
    ),
    id: stringValue(rawAsset.id) || `reference_${index + 1}`,
    url: stringValue(rawAsset.url),
    role: enumValue(
      rawAsset.role,
      ["first_frame", "character_reference", "style_reference"] as const,
      "character_reference",
    ),
  };
}

function normalizeVideoJob(job: unknown, index: number) {
  const rawJob: AnyRecord = isRecord(job) ? job : { prompt: job };
  const provider = enumValue(
    rawJob.provider,
    ["generic", "sora", "veo", "runway", "kling"] as const,
    "generic",
  );

  return {
    job_id:
      stringValue(rawJob.job_id) ||
      stringValue(rawJob.id) ||
      `video_job_${String(index + 1).padStart(3, "0")}`,
    provider,
    model: stringValue(rawJob.model) || `${provider}-video-model`,
    source_shot_id:
      stringValue(rawJob.source_shot_id) ||
      stringValue(rawJob.shot_id) ||
      `shot_${String(index + 1).padStart(3, "0")}`,
    prompt:
      stringValue(rawJob.prompt) ||
      stringValue(rawJob.visual_prompt) ||
      "待补充视频生成提示词",
    negative_prompt:
      stringValue(rawJob.negative_prompt) ||
      "blurry, low quality, distorted hands, extra fingers, watermark, logo",
    duration_seconds: normalizeDuration(
      rawJob.duration_seconds ?? rawJob.duration ?? rawJob.seconds,
    ),
    aspect_ratio: enumValue(
      rawJob.aspect_ratio ?? rawJob.ratio,
      ["9:16", "16:9", "1:1"] as const,
      "9:16",
    ),
    resolution: stringValue(rawJob.resolution) || "720x1280",
    seed:
      typeof rawJob.seed === "number" && Number.isFinite(rawJob.seed)
        ? rawJob.seed
        : null,
    reference_assets: arrayValue(rawJob.reference_assets).map(
      normalizeReferenceAsset,
    ),
    audio: {
      dialogue: stringValue(isRecord(rawJob.audio) ? rawJob.audio.dialogue : ""),
      voice_style:
        stringValue(isRecord(rawJob.audio) ? rawJob.audio.voice_style : "") ||
        "natural narration",
      sfx:
        stringValue(isRecord(rawJob.audio) ? rawJob.audio.sfx : "") ||
        "ambient sound",
      music_mood:
        stringValue(isRecord(rawJob.audio) ? rawJob.audio.music_mood : "") ||
        "cinematic suspense",
    },
    status: enumValue(
      rawJob.status,
      ["draft", "ready", "queued", "in_progress", "completed", "failed"] as const,
      "draft",
    ),
  };
}

function normalizeVideoJobsYaml(parsed: unknown) {
  if (!isRecord(parsed)) {
    return parsed;
  }

  const rawJobs = parsed.video_generation_jobs ?? parsed.jobs ?? parsed.videoJobs;

  return {
    video_generation_jobs: arrayValue(rawJobs).map(normalizeVideoJob),
  };
}

export function parseAndValidateVideoJobsYaml(rawContent: string) {
  const document = parseDocument(rawContent, { prettyErrors: false });

  if (document.errors.length > 0) {
    throw new ConversionError(
      "视频任务内容不是合法 YAML",
      "invalid_yaml",
      502,
      document.errors.map((error) => error.message),
    );
  }

  const normalized = normalizeVideoJobsYaml(document.toJSON());
  const result = videoJobsYamlSchema.safeParse(normalized);

  if (!result.success) {
    throw new ConversionError(
      "视频任务 YAML 不符合 Schema",
      "invalid_schema",
      502,
      result.error.flatten(),
    );
  }

  return {
    jobs: result.data.video_generation_jobs,
    yaml: stringify(result.data, { lineWidth: 0 }).trim(),
  };
}

