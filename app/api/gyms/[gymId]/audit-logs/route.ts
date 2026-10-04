import { NextResponse } from "next/server";
import { requireGymRole } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request, context: RouteContext) {
  const { gymId } = await context.params;
  const access = await requireGymRole(gymId, ["OWNER"]);

  if (!access.ok) {
    return access.response;
  }

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

  const logs = await prisma.auditLog.findMany({
    where: { gymId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
    select: {
      id: true,
      action: true,
      subjectType: true,
      subjectId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });

  const hasMore = logs.length > pageSize;
  return NextResponse.json({
    auditLogs: logs.slice(0, pageSize),
    page,
    pageSize,
    hasMore,
  });
}
