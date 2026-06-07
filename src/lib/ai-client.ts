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

type ChatCompletionRequestBody = {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  stream: false;
  thinking?: {
    type: "disabled";
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(textFromContent).join("");
  }

  if (!isRecord(value)) {
    return "";
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  if (typeof value.content === "string" || Array.isArray(value.content)) {
    return textFromContent(value.content);
  }

  return "";
}

function extractGeneratedContent(data: unknown) {
  if (!isRecord(data)) {
    return "";
  }

  if (Array.isArray(data.choices)) {
    for (const choice of data.choices) {
      if (!isRecord(choice)) {
        continue;
      }

      if (isRecord(choice.message)) {
        const messageContent = textFromContent(choice.message.content).trim();

        if (messageContent) {
          return messageContent;
        }
      }

      if (isRecord(choice.delta)) {
        const deltaContent = textFromContent(choice.delta.content).trim();

        if (deltaContent) {
          return deltaContent;
        }
      }
    }
  }

  const outputText = textFromContent(data.output_text).trim();

  if (outputText) {
    return outputText;
  }

  return textFromContent(data.output).trim();
}

function readErrorMessage(data: unknown) {
  if (!isRecord(data)) {
    return undefined;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (isRecord(data.error) && typeof data.error.message === "string") {
    return data.error.message;
  }

  return undefined;
}

function emptyResponseDetails(data: unknown) {
  if (!isRecord(data)) {
    return {
      response_type: typeof data,
    };
  }

  const details: Record<string, unknown> = {
    response_keys: Object.keys(data).slice(0, 20),
  };

  if (Array.isArray(data.choices)) {
    details.choice_count = data.choices.length;

    const firstChoice = data.choices[0];

    if (isRecord(firstChoice)) {
      details.choice_keys = Object.keys(firstChoice).slice(0, 20);

      if (
        typeof firstChoice.finish_reason === "string" ||
        firstChoice.finish_reason === null
      ) {
        details.finish_reason = firstChoice.finish_reason;
      }

      if (isRecord(firstChoice.message)) {
        details.message_keys = Object.keys(firstChoice.message).slice(0, 20);
        details.message_content_type = Array.isArray(
          firstChoice.message.content,
        )
          ? "array"
          : firstChoice.message.content === null
            ? "null"
            : typeof firstChoice.message.content;
        details.has_reasoning_content =
          textFromContent(firstChoice.message.reasoning_content).trim().length >
          0;
        details.has_refusal =
          textFromContent(firstChoice.message.refusal).trim().length > 0;
      }
    }
  }

  if (Array.isArray(data.output)) {
    details.output_count = data.output.length;
  }

  return details;
}

function chatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function shouldDisableThinking(baseUrl: string, model: string) {
  return (
    baseUrl.toLowerCase().includes("api.deepseek.com") &&
    model.toLowerCase().startsWith("deepseek-v4-")
  );
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
      const body: ChatCompletionRequestBody = {
        model,
        messages,
        temperature: 0.2,
        stream: false,
      };

      if (shouldDisableThinking(baseUrl, model)) {
        body.thinking = { type: "disabled" };
      }

      const response = await fetch(chatCompletionsUrl(baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw new ConversionError(
          readErrorMessage(data) ?? `AI 请求失败，HTTP ${response.status}`,
          "ai_request_failed",
          502,
        );
      }

      const content = extractGeneratedContent(data);

      if (!content) {
        throw new ConversionError(
          "AI 返回为空，无法生成内容",
          "empty_ai_response",
          502,
          emptyResponseDetails(data),
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
