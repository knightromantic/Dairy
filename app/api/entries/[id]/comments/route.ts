import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { maskEmail } from "@/lib/mask-email";
import { paragraphCount } from "@/lib/paragraphs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: entryId } = await ctx.params;
  const session = await getSession();

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }
  if (entry.isDraft) {
    if (session.user?.userId !== entry.authorId) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    return NextResponse.json({ comments: [] });
  }

  const comments = await prisma.comment.findMany({
    where: { entryId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      paragraphIndex: c.paragraphIndex,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.author.id,
        display: maskEmail(c.author.email),
      },
    })),
  });
}

const postSchema = z.object({
  paragraphIndex: z.number().int().min(0),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: entryId } = await ctx.params;
  // 只选取校验所需字段，避免拉取整条 content
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    select: { isDraft: true, authorId: true, content: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }
  if (entry.isDraft) {
    if (session.user.userId !== entry.authorId) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "草稿不支持评论" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const maxIdx = paragraphCount(entry.content) - 1;
  if (parsed.data.paragraphIndex > maxIdx) {
    return NextResponse.json(
      { error: `段落索引无效，当前正文共 ${maxIdx + 1} 段` },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      entryId,
      authorId: session.user.userId,
      paragraphIndex: parsed.data.paragraphIndex,
      content: parsed.data.content.trim(),
    },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  revalidatePath(`/entries/${entryId}`);

  return NextResponse.json({
    id: comment.id,
    paragraphIndex: comment.paragraphIndex,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      display: maskEmail(comment.author.email),
    },
  });
}
