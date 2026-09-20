import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  try {
    const habits = await prisma.habit.findMany({
      where: {
        userId: user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      habits,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load habits" },
      { status: 500 }
    );
  }
}
