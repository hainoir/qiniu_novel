import { NextResponse } from "next/server";
import { ConversionError, convertNovelToScript } from "@/lib/converter";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "请求体必须是 JSON",
        code: "invalid_request",
      },
      { status: 400 },
    );
  }

  try {
    const result = await convertNovelToScript(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConversionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "剧本转换失败",
        code: "ai_request_failed",
      },
      { status: 500 },
    );
  }
}
