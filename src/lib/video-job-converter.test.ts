import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertStoryboardToVideoJobs } from "./video-job-converter";
import { parseAndValidateVideoJobsYaml } from "./video-job-schema";

const storyboardYaml = readFileSync(
  join(process.cwd(), "examples", "sample-storyboard.yaml"),
  "utf8",
);

const videoJobsYaml = readFileSync(
  join(process.cwd(), "examples", "sample-video-jobs.yaml"),
  "utf8",
);

describe("convertStoryboardToVideoJobs", () => {
  it("rejects missing storyboard input", () => {
    expect(() => convertStoryboardToVideoJobs({})).toThrow(
      "请提供 storyboard 对象或 storyboard_yaml 文本",
    );
  });

  it("converts storyboard YAML into generic video jobs", () => {
    const result = convertStoryboardToVideoJobs({
      storyboard_yaml: storyboardYaml,
      provider: "generic",
    });

    expect(result.jobs.length).toBeGreaterThan(0);
    expect(result.jobs[0].provider).toBe("generic");
    expect(result.jobs[0].aspect_ratio).toBe("9:16");
    expect(result.jobs[0].prompt).toContain("镜头语言");
  });

  it("parses the repository sample video jobs YAML", () => {
    const result = parseAndValidateVideoJobsYaml(videoJobsYaml);

    expect(result.jobs).toHaveLength(3);
    expect(result.jobs[0].source_shot_id).toBe("shot_001");
  });

  it("normalizes loose video jobs YAML before validation", () => {
    const looseYaml = `
jobs:
  - id: job_loose
    shot_id: shot_001
    prompt: 旧车站雨夜，林澈展开匿名信
    seconds: 7
    ratio: "9:16"
`;

    const result = parseAndValidateVideoJobsYaml(looseYaml);

    expect(result.jobs[0].job_id).toBe("job_loose");
    expect(result.jobs[0].duration_seconds).toBe(7);
    expect(result.jobs[0].status).toBe("draft");
  });
});

