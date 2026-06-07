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
  maxTokens?: number;
  timeoutMs?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
      refusal?: unknown;
      reasoning_content?: unknown;
    };
    text?: unknown;
    delta?: {
      content?: unknown;
    };
    finish_reason?: unknown;
  }>;
  output_text?: unknown;
  output?: Array<{
    content?: unknown;
    text?: unknown;
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

function positiveInteger(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function flattenTextContent(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenTextContent);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  return [
    ...flattenTextContent(record.text),
    ...flattenTextContent(record.value),
    ...flattenTextContent(record.content),
  ];
}

function firstNonEmptyText(values: unknown[]) {
  for (const value of values) {
    const text = flattenTextContent(value).join("").trim();

    if (text) {
      return text;
    }
  }

  return "";
}

export function extractAIContent(data: ChatCompletionResponse) {
  const choice = data.choices?.[0];

  return firstNonEmptyText([
    choice?.message?.content,
    choice?.text,
    choice?.delta?.content,
    data.output_text,
    data.output,
  ]);
}

function emptyResponseHint(data: ChatCompletionResponse) {
  const choice = data.choices?.[0];
  const finishReason = stringValue(choice?.finish_reason);
  const refusal = firstNonEmptyText([choice?.message?.refusal]);
  const reasoning = firstNonEmptyText([choice?.message?.reasoning_content]);

  if (finishReason === "length") {
    return "模型输出被长度限制截断，建议减少章节数量或提高 AI_MAX_OUTPUT_TOKENS";
  }

  if (finishReason) {
    return `模型 finish_reason=${finishReason}`;
  }

  if (refusal) {
    return `模型拒绝生成：${refusal}`;
  }

  if (reasoning) {
    return "模型只返回了推理内容，没有返回最终 YAML";
  }

  return "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
          max_tokens:
            this.config.maxTokens ??
            positiveInteger(process.env.AI_MAX_OUTPUT_TOKENS) ??
            4096,
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

      const content = extractAIContent(data);

      if (!content) {
        const hint = emptyResponseHint(data);
        throw new ConversionError(
          hint
            ? `AI 返回为空，无法生成剧本 YAML（${hint}）`
            : "AI 返回为空，无法生成剧本 YAML",
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
    maxTokens: positiveInteger(process.env.AI_MAX_OUTPUT_TOKENS),
  });
}
