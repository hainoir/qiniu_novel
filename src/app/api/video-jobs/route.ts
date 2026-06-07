import { NextResponse } from "next/server";
import { ConversionError } from "@/lib/errors";
import { convertStoryboardToVideoJobs } from "@/lib/video-job-converter";

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
    const result = convertStoryboardToVideoJobs(payload);
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
        error: "视频任务生成失败",
        code: "invalid_schema",
      },
      { status: 500 },
    );
  }
}

