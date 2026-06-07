import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAICompatibleClient } from "./ai-client";

function mockFetchResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function createClient() {
  return new OpenAICompatibleClient({
    baseUrl: "https://example.test/v1",
    apiKey: "test-key",
    model: "test-model",
  });
}

describe("OpenAICompatibleClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads standard chat completion message content", async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: "meta:\n  title: 标准返回",
          },
        },
      ],
    });

    await expect(createClient().generate([])).resolves.toBe(
      "meta:\n  title: 标准返回",
    );
  });

  it("reads array-based message content parts", async () => {
    mockFetchResponse({
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "meta:\n" },
              { type: "text", text: "  title: 数组返回" },
            ],
          },
        },
      ],
    });

    await expect(createClient().generate([])).resolves.toBe(
      "meta:\n  title: 数组返回",
    );
  });

  it("reads responses-style output_text when present", async () => {
    mockFetchResponse({
      output_text: "meta:\n  title: Responses 返回",
    });

    await expect(createClient().generate([])).resolves.toBe(
      "meta:\n  title: Responses 返回",
    );
  });

  it("disables DeepSeek V4 thinking mode for structured YAML generation", async () => {
    const fetchMock = mockFetchResponse({
      choices: [
        {
          message: {
            content: "meta:\n  title: DeepSeek 返回",
          },
        },
      ],
    });

    const client = new OpenAICompatibleClient({
      baseUrl: "https://api.deepseek.com",
      apiKey: "test-key",
      model: "deepseek-v4-pro",
    });

    await client.generate([]);

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(requestInit.body as string)).toMatchObject({
      model: "deepseek-v4-pro",
      stream: false,
      thinking: { type: "disabled" },
    });
  });

  it("reports empty AI responses with diagnostic details", async () => {
    mockFetchResponse({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: "",
            reasoning_content: "内部推理不应作为最终 YAML 使用",
          },
        },
      ],
    });

    await expect(createClient().generate([])).rejects.toMatchObject({
      code: "empty_ai_response",
      status: 502,
      details: {
        finish_reason: "stop",
        has_reasoning_content: true,
        message_content_type: "string",
      },
    });
  });
});
