import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  try {
    const entries = await prisma.journalEntry.findMany({
      where: {
        userId: user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      entries,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load journal entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (!title) {
    return NextResponse.json(
      { error: "Title must be a non-empty string" },
      { status: 400 }
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "Content must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const entry = await prisma.journalEntry.create({
      data: {
        userId: user!.id,
        title,
        content,
      },
    });

    return NextResponse.json(
      {
        success: true,
        entry,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    );
  }
}
