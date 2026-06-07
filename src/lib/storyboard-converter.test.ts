import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ScriptAIClient } from "./ai-client";
import { convertScriptToStoryboard } from "./storyboard-converter";
import { parseAndValidateStoryboardYaml } from "./storyboard-schema";

const scriptYaml = readFileSync(
  join(process.cwd(), "examples", "sample-script.yaml"),
  "utf8",
);

const storyboardYaml = readFileSync(
  join(process.cwd(), "examples", "sample-storyboard.yaml"),
  "utf8",
);

function mockClient(content: string): ScriptAIClient {
  return {
    async generate() {
      return content;
    },
  };
}

describe("convertScriptToStoryboard", () => {
  it("rejects missing script input", async () => {
    await expect(
      convertScriptToStoryboard({}, mockClient(storyboardYaml)),
    ).rejects.toMatchObject({
      code: "invalid_request",
      status: 400,
    });
  });

  it("rejects invalid storyboard YAML returned by AI", async () => {
    await expect(
      convertScriptToStoryboard({ script_yaml: scriptYaml }, mockClient("meta: [")),
    ).rejects.toMatchObject({
      code: "invalid_yaml",
      status: 502,
    });
  });

  it("accepts a valid storyboard YAML returned by AI", async () => {
    const result = await convertScriptToStoryboard(
      { script_yaml: scriptYaml },
      mockClient(storyboardYaml),
    );

    expect(result.storyboard.meta.format).toBe("ai_comic_drama");
    expect(result.storyboard.scenes[0].source_scene_id).toBe("scene_1");
    expect(result.yaml).toContain("visual_prompt:");
  });

  it("normalizes loose storyboard YAML before validation", () => {
    const looseYaml = `
meta:
  title: 松散分镜
  style: 2D anime
characters:
  - name: 林澈
    look: 黑色风衣，短黑发
scenes:
  - scene_id: scene_1
    location: 旧车站
    time: 雨夜
    mood: 悬疑
    storyboards:
      - id: shot_custom
        seconds: 7
        size: close_up
        movement: push_in
        subject: 林澈
        action: 展开匿名信
        prompt: 林澈在雨夜旧车站展开匿名信，2D 动漫悬疑风格
`;

    const result = parseAndValidateStoryboardYaml(looseYaml, ["scene_1"]);

    expect(result.storyboard.meta.aspect_ratio).toBe("9:16");
    expect(result.storyboard.scenes[0].shots[0].duration_seconds).toBe(7);
    expect(result.storyboard.scenes[0].shots[0].shot_size).toBe("close_up");
  });

  it("parses the repository sample storyboard YAML", () => {
    const result = parseAndValidateStoryboardYaml(storyboardYaml, [
      "scene_1",
      "scene_2",
    ]);

    expect(result.storyboard.scenes).toHaveLength(2);
    expect(result.storyboard.scenes[0].shots.length).toBeGreaterThan(0);
  });
});
