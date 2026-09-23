import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

async function findOwnedEntry(entryId: string, userId: string) {
  return prisma.journalEntry.findFirst({
    where: {
      id: entryId,
      userId,
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { entryId } = await context.params;

  try {
    const entry = await findOwnedEntry(entryId, user!.id);

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load journal entry" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { entryId } = await context.params;
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
  const updateData: { title?: string; content?: string } = {};
  const supportedFields = ["title", "content"];
  const providedFields = supportedFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(input, field)
  );

  if (providedFields.length === 0) {
    return NextResponse.json(
      { error: "At least one supported field is required" },
      { status: 400 }
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, "title")) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return NextResponse.json(
        { error: "Title must be a non-empty string" },
        { status: 400 }
      );
    }
    updateData.title = input.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(input, "content")) {
    if (typeof input.content !== "string" || !input.content.trim()) {
      return NextResponse.json(
        { error: "Content must be a non-empty string" },
        { status: 400 }
      );
    }
    updateData.content = input.content.trim();
  }

  try {
    const entry = await findOwnedEntry(entryId, user!.id);

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    const updatedEntry = await prisma.journalEntry.update({
      where: {
        id: entry.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { entryId } = await context.params;

  try {
    const entry = await findOwnedEntry(entryId, user!.id);

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    await prisma.journalEntry.delete({
      where: {
        id: entry.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete journal entry" },
      { status: 500 }
    );
  }
}
