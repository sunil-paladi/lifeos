import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { habitId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const supportedFields = [
    "name",
    "description",
    "frequency",
    "target",
    "unit",
    "isActive",
  ] as const;
  const providedFields = supportedFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(input, field)
  );

  if (providedFields.length === 0) {
    return NextResponse.json(
      { error: "At least one supported field is required" },
      { status: 400 }
    );
  }

  if (
    input.name !== undefined &&
    (typeof input.name !== "string" || !input.name.trim())
  ) {
    return NextResponse.json(
      { error: "Name must be a non-empty string" },
      { status: 400 }
    );
  }

  if (input.description !== undefined && typeof input.description !== "string") {
    return NextResponse.json(
      { error: "Description must be a string" },
      { status: 400 }
    );
  }

  if (
    input.frequency !== undefined &&
    (typeof input.frequency !== "string" || !input.frequency.trim())
  ) {
    return NextResponse.json(
      { error: "Frequency must be a non-empty string" },
      { status: 400 }
    );
  }

  if (
    input.target !== undefined &&
    (typeof input.target !== "number" || !Number.isInteger(input.target))
  ) {
    return NextResponse.json(
      { error: "Target must be an integer" },
      { status: 400 }
    );
  }

  if (input.unit !== undefined && typeof input.unit !== "string") {
    return NextResponse.json(
      { error: "Unit must be a string" },
      { status: 400 }
    );
  }

  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 }
    );
  }

  const updateData: {
    name?: string;
    description?: string;
    frequency?: string;
    target?: number;
    unit?: string;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.frequency !== undefined) {
    updateData.frequency = input.frequency;
  }

  if (input.target !== undefined) {
    updateData.target = input.target;
  }

  if (input.unit !== undefined) {
    updateData.unit = input.unit;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  try {
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId: user!.id,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found" },
        { status: 404 }
      );
    }

    const updatedHabit = await prisma.habit.update({
      where: {
        id: habit.id,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      habit: updatedHabit,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update habit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { habitId } = await context.params;

  try {
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId: user!.id,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found" },
        { status: 404 }
      );
    }

    await prisma.habit.delete({
      where: {
        id: habit.id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete habit" },
      { status: 500 }
    );
  }
}