import { NextResponse } from "next/server";

export function logServerError(context: string, error: unknown) {
  const errorDetails =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          code:
            typeof error === "object" && error !== null && "code" in error
              ? String((error as { code?: unknown }).code)
              : undefined,
        }
      : {
          type: typeof error,
          value: Object.prototype.toString.call(error),
        };

  console.error(context, errorDetails);
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function safeInternalError(message = "Something went wrong") {
  return jsonError(message, 500);
}
