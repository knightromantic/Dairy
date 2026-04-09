import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await getSession();
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  if (entry.isDraft && session.user?.userId !== entry.author.id) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    isDraft: entry.isDraft,
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

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }
  if (entry.authorId !== session.user.userId) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
