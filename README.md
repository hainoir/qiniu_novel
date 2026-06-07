# AI 小说转剧本工具

题目三：AI 小说转剧本工具。项目面向希望把小说改编成 AI 漫剧、AI 短剧或动态漫画的作者，支持粘贴 3 个章节以上的小说文本，并通过 OpenAI 兼容接口生成结构化 YAML 剧本初稿，再进一步生成分镜 YAML。

Demo 视频：[Bilibili](https://www.bilibili.com/video/BV1BJEb6oEbm)。

## 项目定位

本项目不是单纯的小说摘要或剧本改写工具，而是面向 AI 漫剧生产的结构化改编工具。

当前主流视频生成模型通常需要 prompt、时长、画幅、镜头运动、主体动作等明确输入。小说作者直接从长篇文本生成视频很困难，因此本项目将小说逐步拆解为剧本 YAML 和分镜 YAML。

当前版本已实现：

```text
小说章节 -> 剧本 YAML -> 分镜 YAML
```

后续接入真实视频模型后的完整链路：

```text
小说章节 -> 剧本 YAML -> 分镜 YAML -> AI 视频片段
```

完整 PRD 位于 [docs/prd.md](docs/prd.md)。

## 为什么需要结构化改编

小说是长文本叙事，常包含心理描写、叙事跳转和隐含动机；视频生成模型更需要明确的主体、动作、地点、镜头、时长、画幅和视觉风格。本项目补齐“小说文本”和“视频化分镜”之间的结构化中间层，让作者可以逐步把故事转换为可编辑、可校验的创作资产。

## 与 AI 视频生成模型的关系

本项目当前不直接生成视频，而是生成视频生成前所需的结构化内容。分镜 Schema 已参考视频化创作所需的输入信息，例如 visual_prompt、duration_seconds、aspect_ratio、negative_prompt、camera_movement 等字段，使小说内容可以逐步转化为可编辑的镜头设计。

## AI 漫剧生产链路

```text
小说
  长文本、心理描写、环境描写、叙事跳转

剧本
  角色、场景、动作、对白、剧情节拍

分镜
  镜号、景别、机位、镜头运动、画面构图、动作、台词/旁白、时长

成片
  多个单元视频按顺序剪辑，补声音、字幕、转场、配乐
```

## 为什么使用 YAML

YAML 同时适合人类编辑和程序解析。对作者来说，它比 JSON 更容易阅读；对系统来说，它可以被校验、转换和传递给后续模块。剧本和分镜都天然是层级结构，因此适合用 YAML 描述。

## 核心功能

- 粘贴至少 3 个小说章节，生成可编辑的 YAML 剧本初稿。
- 输出结构包含作品信息、来源章节、角色表、场景、动作、对白、情绪/语气和修改建议。
- 每个场景保留来源章节引用，便于作者核对改编依据。
- 从剧本 YAML 生成分镜 YAML，每个镜头包含时长、景别、机位、镜头运动、构图、动作、台词/旁白和视觉 prompt。
- 支持在页面内继续编辑剧本和分镜 YAML，并复制或下载 `.yaml` 文件。
- 提供剧本 YAML Schema 文档：[docs/script-yaml-schema.md](docs/script-yaml-schema.md)。
- 提供分镜 YAML Schema 文档：[docs/storyboard-yaml-schema.md](docs/storyboard-yaml-schema.md)。

## 技术栈

| 依赖 | 用途 |
| --- | --- |
| Next.js | Web 应用、App Router、API Route |
| React | 前端交互界面 |
| TypeScript | 类型约束和可维护性 |
| Tailwind CSS | 页面样式 |
| Zod | 请求参数和剧本结构校验 |
| YAML | 解析并规范化 AI 返回的 YAML |
| lucide-react | 按钮和工具图标 |
| Vitest | 核心转换逻辑单元测试 |

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可手动复制 `.env.example` 为 `.env.local`。

`.env.local` 示例：

```bash
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
AI_API_KEY=replace_with_your_key
```

`AI_BASE_URL` 应填写 OpenAI 兼容接口的 `v1` 地址。如果服务商直接提供 `/chat/completions` 完整地址，也可以直接填写该地址。

## 测试与构建

```bash
npm run test
npm run build
```

测试覆盖：

- 少于 3 个章节时拒绝生成。
- 空章节内容时拒绝生成。
- AI 返回非法 YAML 时返回错误。
- AI 返回合法 YAML 时完成解析和 Schema 校验。
- 剧本 YAML 可以转换为分镜 YAML，并校验来源场景追溯关系。
- 示例 YAML 可以被解析并通过 Schema 校验。

## YAML Schema

Schema 文档位于：

- [docs/script-yaml-schema.md](docs/script-yaml-schema.md)
- [docs/storyboard-yaml-schema.md](docs/storyboard-yaml-schema.md)

示例输入和示例输出位于：

- [examples/sample-input.md](examples/sample-input.md)
- [examples/sample-script.yaml](examples/sample-script.yaml)
- [examples/sample-storyboard.yaml](examples/sample-storyboard.yaml)

## API

`POST /api/convert`

请求体：

```json
{
  "chapters": [
    {
      "title": "第一章",
      "content": "小说正文"
    },
    {
      "title": "第二章",
      "content": "小说正文"
    },
    {
      "title": "第三章",
      "content": "小说正文"
    }
  ]
}
```

成功响应：

```json
{
  "yaml": "meta:\\n  title: ...",
  "script": {
    "meta": {},
    "source_chapters": [],
    "characters": [],
    "scenes": [],
    "revision_notes": []
  }
}
```

`POST /api/storyboard`

请求体：

```json
{
  "script_yaml": "meta:\n  title: ..."
}
```

成功响应：

```json
{
  "yaml": "meta:\n  title: ...",
  "storyboard": {
    "meta": {},
    "characters": [],
    "scenes": []
  }
}
```

## 原创性说明

本项目为个人从零开发，核心功能包括小说章节输入、AI 转换提示词、OpenAI 兼容接口调用、YAML Schema 校验、Web 编辑/复制/下载工作台和文档说明。项目引用的第三方库已在“技术栈”中列明。

如后续复用本人历史代码片段、外部模板或第三方示例代码，必须在对应 PR 描述和本 README 中补充来源、范围和改动说明。

## 提交规范

- 作品批次时间：2026-06-05 00:00 至 2026-06-07 23:59，时区按 Asia/Hong_Kong。
- 每个功能通过单独 PR 提交，PR 只做一件事。
- PR 描述必须包含功能描述、实现思路、测试方式。
- 主分支在每次 PR 合并后必须保持 `npm run build` 可通过。
- GitHub 仓库需在开题后创建，并在提交截止后保持评委可访问。
