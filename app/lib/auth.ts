import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

async function sendPasswordResetEmail({
  user,
  url,
}: {
  user: { email: string };
  url: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error("Password reset email delivery is not configured.");
    return;
  }

  const safeUrl = url
    .replace(/&/g, "&amp;")
    .replace(/\"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Reset your LifeOS password",
        text: `Use this link to reset your password. It expires in 30 minutes.\n\n${url}`,
        html: `<p>Use the link below to reset your LifeOS password. It expires in 30 minutes.</p><p><a href="${safeUrl}">Reset password</a></p>`,
      }),
    });

    if (!response.ok) {
      console.error("Password reset email delivery failed.", response.status);
    }
  } catch {
    console.error("Password reset email delivery failed.");
  }
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value)),

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: sendPasswordResetEmail,
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  plugins: [
    username({
      displayUsername: false,
      immutableUsername: true,
    }),
  ],
});
