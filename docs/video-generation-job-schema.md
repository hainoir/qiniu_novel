# 视频生成任务 YAML Schema

视频生成任务 YAML 是分镜 YAML 的下一层结构，用来把每个镜头转换为可投递给视频生成模型的任务。当前版本不直接调用真实视频 API，而是生成 provider-agnostic 的通用任务描述：

```text
storyboard_yaml -> video_generation_jobs -> provider adapter -> video API
```

## 顶层结构

```yaml
video_generation_jobs:
  - job_id: string
    provider: generic | sora | veo | runway | kling
    model: string
    source_shot_id: string
    prompt: string
    negative_prompt: string
    duration_seconds: number
    aspect_ratio: "9:16" | "16:9" | "1:1"
    resolution: string
    seed: number | null
    reference_assets:
      - type: image | video | character | style
        id: string
        url: string
        role: first_frame | character_reference | style_reference
    audio:
      dialogue: string
      voice_style: string
      sfx: string
      music_mood: string
    status: draft | ready | queued | in_progress | completed | failed
```

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `job_id` | string | 是 | 视频生成任务 ID。 |
| `provider` | enum | 是 | 目标视频生成服务，当前默认 `generic`。 |
| `model` | string | 是 | 模型名或占位模型名。 |
| `source_shot_id` | string | 是 | 来源分镜镜头 ID，保证可追溯。 |
| `prompt` | string | 是 | 投递给视频模型的主提示词。 |
| `negative_prompt` | string | 是 | 避免低质量、变形、文字错误等问题的负向提示。 |
| `duration_seconds` | number | 是 | 单元视频时长。 |
| `aspect_ratio` | enum | 是 | 视频画幅。 |
| `resolution` | string | 是 | 分辨率，例如 `720x1280`。 |
| `seed` | number/null | 是 | 随机种子；未知时为 `null`。 |
| `reference_assets` | array | 是 | 参考图、角色参考、风格参考等素材。 |
| `audio.dialogue` | string | 是 | 本视频单元的对白或旁白。 |
| `audio.voice_style` | string | 是 | 语音风格提示。 |
| `audio.sfx` | string | 是 | 音效提示。 |
| `audio.music_mood` | string | 是 | 配乐情绪提示。 |
| `status` | enum | 是 | 任务状态；生成前通常是 `draft` 或 `ready`。 |

## 设计原因

1. 主流视频生成 API 通常围绕单个短视频任务工作，因此每个 shot 应转成一个 job。
2. `prompt`、`duration_seconds`、`aspect_ratio`、`negative_prompt`、`reference_assets` 是视频模型常见输入。
3. `provider` 保留抽象层，先生成通用任务，后续再适配 Sora、Veo、Runway、可灵等具体接口。
4. `source_shot_id` 让生成任务可以追溯回分镜和剧本，便于失败重试、重新生成和人工修正。
5. `status` 预留任务生命周期，后续可扩展 queued、in_progress、completed、failed 等异步状态。

## Provider Adapter 方向

后续版本可以增加适配器：

```text
generic video_generation_job
  -> Sora request
  -> Veo request
  -> Runway request
  -> Kling request
```

适配器只负责字段映射，不改变上游分镜和剧本结构。

