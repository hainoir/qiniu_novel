# 剧本 YAML Schema

本文档定义 AI 小说转剧本工具的 YAML 输出结构。该 Schema 面向作者的剧本初稿编辑场景，目标是让 3 个章节以上的小说文本被转换为可追溯、可拆分、可继续打磨的结构化剧本。

## 顶层结构

```yaml
meta:
  title: string
  original_type: novel
  target_format: screenplay_yaml
  synopsis: string
  tone: string
source_chapters:
  - id: chapter_1
    title: string
    summary: string
    key_events:
      - string
characters:
  - id: character_id
    name: string
    role: string
    motivation: string
    traits:
      - string
scenes:
  - id: scene_1
    source_chapter_ids:
      - chapter_1
    location: string
    time: string
    purpose: string
    characters:
      - string
    beats:
      - string
    actions:
      - character: string
        description: string
        camera: string
    dialogue:
      - character: string
        line: string
        emotion: string
        subtext: string
    mood: string
    transition: string
    notes: string
revision_notes:
  - string
```

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `meta.title` | string | 是 | 剧本初稿标题，可沿用小说标题或由 AI 根据章节概括生成。 |
| `meta.original_type` | string | 是 | 原始文本类型，当前固定为 `novel`。 |
| `meta.target_format` | string | 是 | 输出目标，当前固定为 `screenplay_yaml`。 |
| `meta.synopsis` | string | 是 | 对输入章节主线的短摘要。 |
| `meta.tone` | string | 是 | 剧本整体气质，例如悬疑、轻喜、现实主义。 |
| `source_chapters` | array | 是 | 来源章节列表，至少 3 项。 |
| `source_chapters[].id` | string | 是 | 章节稳定 ID，建议使用 `chapter_1` 这种形式。 |
| `source_chapters[].summary` | string | 是 | 对该章剧情的概括。 |
| `source_chapters[].key_events` | array | 是 | 可被改编为场景的关键事件。 |
| `characters` | array | 是 | 角色表，至少 1 项。 |
| `characters[].id` | string | 是 | 角色稳定 ID，用于后续编辑、检索或跨场景引用。 |
| `characters[].name` | string | 是 | 角色显示名。 |
| `characters[].role` | string | 是 | 角色在故事中的职责，例如主角、反派、线索人物。 |
| `characters[].motivation` | string | 是 | 角色当前阶段的行动动机。 |
| `characters[].traits` | array | 是 | 角色性格或表演方向标签。 |
| `scenes` | array | 是 | 剧本场景列表，至少 1 项。 |
| `scenes[].id` | string | 是 | 场景稳定 ID。 |
| `scenes[].source_chapter_ids` | array | 是 | 场景依据的来源章节 ID，必须能在 `source_chapters` 中找到。 |
| `scenes[].location` | string | 是 | 场景地点。 |
| `scenes[].time` | string | 是 | 场景时间或时间段。 |
| `scenes[].purpose` | string | 是 | 场景在剧作结构中的作用。 |
| `scenes[].characters` | array | 是 | 本场出现的角色名。 |
| `scenes[].beats` | array | 是 | 本场剧情节拍。 |
| `scenes[].actions` | array | 是 | 动作描写，至少包含 `description`。 |
| `scenes[].dialogue` | array | 是 | 对白列表，可为空数组，但每条对白必须包含角色和台词。 |
| `scenes[].mood` | string | 是 | 情绪氛围或表演基调。 |
| `scenes[].transition` | string | 否 | 转场建议。 |
| `scenes[].notes` | string | 否 | 给作者或编剧的场景备注。 |
| `revision_notes` | array | 否 | 后续修改建议。 |

## 设计原因

1. 保留 `source_chapters`，让作者知道每个剧本场景来自哪些小说章节，便于核对 AI 是否偏离原文。
2. 单独抽出 `characters`，避免角色信息散落在对白和动作中，方便后续做角色表、演员表或一致性检查。
3. `scenes` 使用独立对象数组，因为剧本创作通常按场景推进，作者可以逐场移动、删改或扩写。
4. 每个场景包含 `purpose`、`beats`、`actions` 和 `dialogue`，同时覆盖剧作结构、动作调度和台词初稿。
5. 字段名使用英文 snake_case，便于程序解析；字段内容使用中文，便于中文小说作者直接编辑。
6. `revision_notes` 不进入具体场景，避免把 AI 的修改建议混入可拍摄文本。

## 校验规则

- 输入小说至少包含 3 个非空章节。
- YAML 顶层必须包含 `meta`、`source_chapters`、`characters`、`scenes`。
- `source_chapters` 至少 3 项，`characters` 至少 1 项，`scenes` 至少 1 项。
- `scenes[].source_chapter_ids` 中的每个 ID 必须存在于 `source_chapters[].id`。
- `actions[].description`、`dialogue[].character` 和 `dialogue[].line` 不能为空。
