import { ConversionError } from "./errors";

export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export interface ScriptAIClient {
  generate(messages: ChatMessage[]): Promise<string>;
}

type OpenAICompatibleConfig = {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  model: string | undefined;
  timeoutMs?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function chatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export class OpenAICompatibleClient implements ScriptAIClient {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generate(messages: ChatMessage[]) {
    const baseUrl = this.config.baseUrl?.trim();
    const apiKey = this.config.apiKey?.trim();
    const model = this.config.model?.trim();

    if (!baseUrl || !apiKey || !model) {
      throw new ConversionError(
        "缺少 AI_BASE_URL、AI_API_KEY 或 AI_MODEL 环境变量",
        "missing_ai_config",
        500,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 60000,
    );

    try {
      const response = await fetch(chatCompletionsUrl(baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as
        | ChatCompletionResponse
        | Record<string, never>;

      if (!response.ok) {
        throw new ConversionError(
          data.error?.message ?? `AI 请求失败，HTTP ${response.status}`,
          "ai_request_failed",
          502,
        );
      }

      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new ConversionError(
          "AI 返回为空，无法生成剧本 YAML",
          "ai_request_failed",
          502,
        );
      }

      return content;
    } catch (error) {
      if (error instanceof ConversionError) {
        throw error;
      }

      throw new ConversionError(
        error instanceof Error ? error.message : "AI 请求异常",
        "ai_request_failed",
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createOpenAICompatibleClient() {
  return new OpenAICompatibleClient({
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
  });
}
