import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const body = await parseJsonObject(request);
  if (!body || Object.keys(body).length !== 1 || body.read !== true) {
    return NextResponse.json({ error: "Request must set read to true" }, { status: 400 });
  }

  const { notificationId } = await context.params;
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, recipientUserId: user.id },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      internalLink: true,
      createdAt: true,
      readAt: true,
    },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  const readAt = new Date();
  const result = await prisma.notification.updateMany({
    where: {
      id: notification.id,
      recipientUserId: user.id,
      readAt: null,
    },
    data: { readAt },
  });
  const updatedNotification = await prisma.notification.findFirst({
    where: { id: notification.id, recipientUserId: user.id },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      internalLink: true,
      createdAt: true,
      readAt: true,
    },
  });
  if (!updatedNotification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  const unreadCount = await prisma.notification.count({
    where: { recipientUserId: user.id, readAt: null },
  });

  return NextResponse.json({
    notification: updatedNotification,
    markedRead: result.count === 1,
    unreadCount,
  });
}
