# AI 小说转剧本工具

题目三：AI 小说转剧本工具。项目面向希望把小说改编成剧本的作者，支持粘贴 3 个章节以上的小说文本，并通过 OpenAI 兼容接口生成结构化 YAML 剧本初稿。

Demo 视频：录制完成后填写外部可访问链接，提交前必须替换此行。

## 核心功能

- 粘贴至少 3 个小说章节，生成可编辑的 YAML 剧本初稿。
- 输出结构包含作品信息、来源章节、角色表、场景、动作、对白、情绪/语气和修改建议。
- 每个场景保留来源章节引用，便于作者核对改编依据。
- 支持在页面内继续编辑 YAML，并复制或下载 `.yaml` 文件。
- 提供剧本 YAML Schema 文档：[docs/script-yaml-schema.md](docs/script-yaml-schema.md)。

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

## YAML Schema

Schema 文档位于 [docs/script-yaml-schema.md](docs/script-yaml-schema.md)。示例输入和示例输出位于：

- [examples/sample-input.md](examples/sample-input.md)
- [examples/sample-script.yaml](examples/sample-script.yaml)

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

## 原创性说明

本项目为个人从零开发，核心功能包括小说章节输入、AI 转换提示词、OpenAI 兼容接口调用、YAML Schema 校验、Web 编辑/复制/下载工作台和文档说明。项目引用的第三方库已在“技术栈”中列明。

如后续复用本人历史代码片段、外部模板或第三方示例代码，必须在对应 PR 描述和本 README 中补充来源、范围和改动说明。

## 提交规范

- 作品批次时间：2026-06-05 00:00 至 2026-06-07 23:59，时区按 Asia/Hong_Kong。
- 每个功能通过单独 PR 提交，PR 只做一件事。
- PR 描述必须包含功能描述、实现思路、测试方式。
- 主分支在每次 PR 合并后必须保持 `npm run build` 可通过。
- GitHub 仓库需在开题后创建，并在提交截止后保持评委可访问。
