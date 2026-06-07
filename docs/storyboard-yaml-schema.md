# 分镜 YAML Schema

分镜 YAML 是剧本 YAML 的下一层结构，用于把剧本场景拆成可被 AI 视频生成模型理解的镜头单元。它不替代剧本 Schema，而是服务以下转换链路：

```text
script_yaml -> storyboard_yaml -> video_generation_jobs
```

## 顶层结构

```yaml
meta:
  title: string
  format: ai_comic_drama
  target_platform: douyin | kuaishou | bilibili | generic
  aspect_ratio: "9:16" | "16:9" | "1:1"
  visual_style: string
characters:
  - id: string
    name: string
    appearance: string
    costume: string
    continuity_notes: string
scenes:
  - id: string
    source_scene_id: string
    location: string
    time: string
    mood: string
    shots:
      - shot_id: string
        duration_seconds: number
        shot_size: close_up | medium_shot | wide_shot | extreme_close_up
        camera_angle: eye_level | high_angle | low_angle | over_the_shoulder
        camera_movement: static | push_in | pull_out | pan | tilt | tracking
        composition: string
        subject: string
        action: string
        dialogue_or_voiceover: string
        visual_prompt: string
        negative_prompt: string
```

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `meta.title` | string | 是 | 分镜标题，通常沿用剧本标题。 |
| `meta.format` | string | 是 | 当前固定为 `ai_comic_drama`，表示面向 AI 漫剧生产。 |
| `meta.target_platform` | enum | 是 | 目标平台，用于决定画幅和节奏。 |
| `meta.aspect_ratio` | enum | 是 | 默认建议 `9:16`，适配竖屏短内容。 |
| `meta.visual_style` | string | 是 | 统一视觉风格，例如 2D anime、国漫、动态漫画。 |
| `characters[].appearance` | string | 是 | 角色外观，用于跨镜头保持一致。 |
| `characters[].costume` | string | 是 | 服装设定，用于视频生成参考。 |
| `characters[].continuity_notes` | string | 是 | 角色连续性说明，减少不同镜头角色漂移。 |
| `scenes[].source_scene_id` | string | 是 | 来源剧本场景 ID，保证可追溯。 |
| `shots[].shot_id` | string | 是 | 镜头 ID，也是后续视频任务的来源。 |
| `shots[].duration_seconds` | number | 是 | 镜头建议时长，通常 4 到 12 秒。 |
| `shots[].shot_size` | enum | 是 | 景别，例如特写、中景、远景。 |
| `shots[].camera_angle` | enum | 是 | 机位角度。 |
| `shots[].camera_movement` | enum | 是 | 镜头运动方式。 |
| `shots[].composition` | string | 是 | 画面构图描述。 |
| `shots[].subject` | string | 是 | 画面主体。 |
| `shots[].action` | string | 是 | 主体动作。 |
| `shots[].dialogue_or_voiceover` | string | 是 | 本镜头中的对白、旁白或空字符串。 |
| `shots[].visual_prompt` | string | 是 | 给视频模型使用的视觉描述。 |
| `shots[].negative_prompt` | string | 是 | 避免画面问题的负向提示。 |

## 设计原因

1. `source_scene_id` 让每个分镜可以追溯回剧本场景，方便作者核对改编依据。
2. `shots` 是视频生成的最小生产单元，后续可以一镜一任务地生成短片段。
3. `duration_seconds`、`aspect_ratio`、`visual_prompt` 和 `negative_prompt` 直接面向视频模型输入。
4. `characters[].continuity_notes` 把角色一致性前置，降低多镜头生成时角色漂移的概率。
5. `camera_angle` 和 `camera_movement` 把文学动作转换为镜头语言，帮助模型理解画面调度。

## 校验规则

- `scenes` 至少包含 1 个场景。
- 每个场景的 `shots` 至少包含 1 个镜头。
- 每个 `shot.duration_seconds` 必须大于 0，建议不超过 12。
- 每个 `shot.visual_prompt` 必须包含主体、动作、场景和风格信息。
- 每个 `source_scene_id` 应该能在剧本 YAML 的 `scenes[].id` 中找到。

