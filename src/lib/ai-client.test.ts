import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleClient, extractAIContent } from "./ai-client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractAIContent", () => {
  it("reads plain chat completion content", () => {
    expect(
      extractAIContent({
        choices: [
          {
            message: {
              content: "  meta:\n    title: 测试\n",
            },
          },
        ],
      }),
    ).toBe("meta:\n    title: 测试");
  });

  it("reads text from content parts returned by compatible providers", () => {
    expect(
      extractAIContent({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "meta:\n" },
                { type: "text", text: "  title: 测试\n" },
              ],
            },
          },
        ],
      }),
    ).toBe("meta:\n  title: 测试");
  });

  it("falls back to responses-style output text", () => {
    expect(
      extractAIContent({
        output_text: "source_chapters: []",
      }),
    ).toBe("source_chapters: []");
  });

  it("falls back to text blocks inside responses-style output", () => {
    expect(
      extractAIContent({
        output: [
          {
            content: [
              { type: "output_text", text: "characters:\n" },
              { type: "output_text", text: "  - name: 林澈\n" },
            ],
          },
        ],
      }),
    ).toBe("characters:\n  - name: 林澈");
  });
});

describe("OpenAICompatibleClient", () => {
  it("sends an explicit output token budget", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "meta:\n  title: 测试\n" } }],
      }),
    } as Response);

    const client = new OpenAICompatibleClient({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      maxTokens: 2048,
      timeoutMs: 1000,
    });

    await expect(
      client.generate([{ role: "user", content: "请生成 YAML" }]),
    ).resolves.toBe("meta:\n  title: 测试");

    const requestBody = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    ) as Record<string, unknown>;

    expect(requestBody.max_tokens).toBe(2048);
  });

  it("explains empty responses caused by length limits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            finish_reason: "length",
            message: { content: "" },
          },
        ],
      }),
    } as Response);

    const client = new OpenAICompatibleClient({
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      model: "test-model",
      timeoutMs: 1000,
    });

    await expect(
      client.generate([{ role: "user", content: "长文本" }]),
    ).rejects.toMatchObject({
      code: "ai_request_failed",
      message: expect.stringContaining("长度限制"),
    });
  });
});
