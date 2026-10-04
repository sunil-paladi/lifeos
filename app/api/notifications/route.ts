import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const searchParams = new URL(request.url).searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_PAGE_SIZE
  ) {
    return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        internalLink: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.notification.count({
      where: { recipientUserId: user.id, readAt: null },
    }),
  ]);

  const hasMore = notifications.length > pageSize;
  return NextResponse.json({
    notifications: notifications.slice(0, pageSize),
    unreadCount,
    page,
    pageSize,
    hasMore,
  });
}
