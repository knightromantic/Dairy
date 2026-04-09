import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing_token`);
  }

  const user = await prisma.user.findFirst({
    where: {
      verifyToken: token,
      verifyTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.redirect(`${base}/login?error=invalid_or_expired_token`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpires: null,
    },
  });

  return NextResponse.redirect(`${base}/login?verified=1`);
}
