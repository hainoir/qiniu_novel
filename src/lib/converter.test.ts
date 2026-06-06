import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { convertNovelToScript } from "./converter";
import { ScriptAIClient } from "./ai-client";
import { ConversionError } from "./errors";
import { parseAndValidateScriptYaml } from "./script-schema";

const chapters = [
  { title: "第一章", content: "夜雨中，林澈在旧车站收到一封没有署名的信。" },
  { title: "第二章", content: "信中提到失踪多年的姐姐，以及一把能打开地下档案室的钥匙。" },
  { title: "第三章", content: "林澈和记者许晚潜入档案室，发现所有线索都指向同一场火灾。" },
];

const validYaml = `
meta:
  title: 旧车站来信
  original_type: novel
  target_format: screenplay_yaml
  synopsis: 林澈收到神秘来信后，与记者许晚追查姐姐失踪真相。
  tone: 悬疑、冷峻
source_chapters:
  - id: chapter_1
    title: 第一章
    summary: 林澈在旧车站收到匿名信。
    key_events:
      - 匿名信出现
  - id: chapter_2
    title: 第二章
    summary: 信件指出姐姐失踪和地下档案室钥匙有关。
    key_events:
      - 钥匙线索出现
  - id: chapter_3
    title: 第三章
    summary: 林澈与许晚潜入档案室，发现火灾线索。
    key_events:
      - 发现火灾档案
characters:
  - id: lin_che
    name: 林澈
    role: 主角
    motivation: 找到姐姐失踪真相
    traits:
      - 克制
      - 执着
scenes:
  - id: scene_1
    source_chapter_ids:
      - chapter_1
      - chapter_2
    location: 旧车站候车厅
    time: 雨夜
    purpose: 建立主线谜题
    characters:
      - 林澈
    beats:
      - 林澈发现匿名信
      - 信中出现姐姐的名字
    actions:
      - character: 林澈
        description: 他把信纸压在湿冷的长椅上，反复确认署名位置。
        camera: 特写信纸边缘的水痕
    dialogue:
      - character: 林澈
        line: 你到底想让我知道什么？
        emotion: 压抑
        subtext: 他意识到旧案被重新打开
    mood: 紧张
    transition: 切至钥匙特写
    notes: 可在后续版本加入寄信人的误导线索。
revision_notes:
  - 增强姐姐失踪前的铺垫。
`;

function mockClient(content: string): ScriptAIClient {
  return {
    async generate() {
      return content;
    },
  };
}

describe("convertNovelToScript", () => {
  it("rejects fewer than 3 chapters", async () => {
    await expect(
      convertNovelToScript({ chapters: chapters.slice(0, 2) }, mockClient(validYaml)),
    ).rejects.toMatchObject({
      code: "invalid_request",
      status: 400,
    });
  });

  it("rejects empty chapter content", async () => {
    await expect(
      convertNovelToScript(
        { chapters: [chapters[0], chapters[1], { title: "第三章", content: "" }] },
        mockClient(validYaml),
      ),
    ).rejects.toBeInstanceOf(ConversionError);
  });

  it("rejects invalid YAML returned by AI", async () => {
    await expect(
      convertNovelToScript({ chapters }, mockClient("meta: [")),
    ).rejects.toMatchObject({
      code: "invalid_yaml",
      status: 502,
    });
  });

  it("accepts valid YAML returned by AI", async () => {
    const result = await convertNovelToScript(
      { chapters },
      mockClient(`\`\`\`yaml\n${validYaml}\n\`\`\``),
    );

    expect(result.script.meta.title).toBe("旧车站来信");
    expect(result.script.source_chapters).toHaveLength(3);
    expect(result.yaml).toContain("source_chapters:");
  });

  it("parses the repository sample YAML", () => {
    const sampleYaml = readFileSync(
      join(process.cwd(), "examples", "sample-script.yaml"),
      "utf8",
    );

    const result = parseAndValidateScriptYaml(sampleYaml);

    expect(result.script.scenes.length).toBeGreaterThan(0);
    expect(result.script.scenes[0].source_chapter_ids).toContain("chapter_1");
  });
});
