import { stringify } from "yaml";
import { z } from "zod";
import { ConversionError } from "./errors";
import {
  StoryboardYaml,
  parseAndValidateStoryboardYaml,
  storyboardYamlSchema,
} from "./storyboard-schema";
import {
  VideoProvider,
  parseAndValidateVideoJobsYaml,
  videoProviderSchema,
} from "./video-job-schema";

const videoJobsRequestSchema = z.object({
  storyboard: storyboardYamlSchema.optional(),
  storyboard_yaml: z.string().optional(),
  provider: videoProviderSchema.default("generic"),
});

const providerModelDefaults: Record<VideoProvider, string> = {
  generic: "generic-video-model",
  sora: "sora-video-model",
  veo: "veo-video-model",
  runway: "runway-video-model",
  kling: "kling-video-model",
};

const resolutionDefaults: Record<StoryboardYaml["meta"]["aspect_ratio"], string> = {
  "9:16": "720x1280",
  "16:9": "1280x720",
  "1:1": "1024x1024",
};

function parseStoryboardPayload(payload: unknown) {
  const request = videoJobsRequestSchema.safeParse(payload);

  if (
    !request.success ||
    (!request.data.storyboard && !request.data.storyboard_yaml)
  ) {
    throw new ConversionError(
      "请提供 storyboard 对象或 storyboard_yaml 文本",
      "invalid_request",
      400,
      request.success ? undefined : request.error.flatten(),
    );
  }

  const storyboard =
    request.data.storyboard ??
    parseAndValidateStoryboardYaml(request.data.storyboard_yaml ?? "").storyboard;

  return {
    storyboard,
    provider: request.data.provider,
  };
}

function shotMatchesCharacter(shotText: string, characterName: string) {
  return characterName.length > 0 && shotText.includes(characterName);
}

function buildReferenceAssets(
  storyboard: StoryboardYaml,
  shotText: string,
) {
  return storyboard.characters
    .filter((character) => shotMatchesCharacter(shotText, character.name))
    .map((character) => ({
      type: "character" as const,
      id: `${character.id}_reference`,
      url: "",
      role: "character_reference" as const,
    }));
}

export function convertStoryboardToVideoJobs(payload: unknown) {
  const { storyboard, provider } = parseStoryboardPayload(payload);
  const jobs = storyboard.scenes.flatMap((scene) =>
    scene.shots.map((shot) => {
      const shotText = [
        shot.subject,
        shot.action,
        shot.dialogue_or_voiceover,
        shot.visual_prompt,
      ].join(" ");

      return {
        job_id: `video_job_${shot.shot_id.replace(/^shot_?/, "")}`,
        provider,
        model: providerModelDefaults[provider],
        source_shot_id: shot.shot_id,
        prompt: [
          shot.visual_prompt,
          `镜头语言：${shot.shot_size}，${shot.camera_angle}，${shot.camera_movement}。`,
          `构图：${shot.composition}`,
          `统一风格：${storyboard.meta.visual_style}`,
        ].join(" "),
        negative_prompt: shot.negative_prompt,
        duration_seconds: shot.duration_seconds,
        aspect_ratio: storyboard.meta.aspect_ratio,
        resolution: resolutionDefaults[storyboard.meta.aspect_ratio],
        seed: null,
        reference_assets: buildReferenceAssets(storyboard, shotText),
        audio: {
          dialogue: shot.dialogue_or_voiceover,
          voice_style: shot.dialogue_or_voiceover
            ? "character dialogue, natural Chinese voice"
            : "low suspense narration",
          sfx: `${scene.location} ambient sound`,
          music_mood: scene.mood,
        },
        status: "draft" as const,
      };
    }),
  );

  const yaml = stringify({ video_generation_jobs: jobs }, { lineWidth: 0 });
  return parseAndValidateVideoJobsYaml(yaml);
}

