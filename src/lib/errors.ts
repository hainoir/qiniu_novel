export type ConversionErrorCode =
  | "invalid_request"
  | "missing_ai_config"
  | "ai_request_failed"
  | "invalid_yaml"
  | "invalid_schema";

export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: ConversionErrorCode,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}
