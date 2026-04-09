import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    author: {
      id: entry.author.id,
      display: maskEmail(entry.author.email),
    },
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}
