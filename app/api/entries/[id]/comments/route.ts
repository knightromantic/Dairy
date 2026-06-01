import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";
import { maskEmail } from "@/lib/mask-email";

type Ctx = { params: Promise<{ id: string }> };

// ── Comment row shape (flat, before tree assembly) ──
type CommentRow = {
  id: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  content: string;
  createdAt: string;
  author: { id: string; display: string };
  parentId: string | null;
  replies: CommentRow[];
};

// ── GET /api/entries/[id]/comments ──
export async function GET(_req: Request, ctx: Ctx) {
  const { id: entryId } = await ctx.params;
  const session = await getSession();

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }
  if (entry.isDraft && session.user?.userId !== entry.authorId) {
    return NextResponse.json({ error: "日记不存在" }, { status: 404 });
  }
  if (entry.isDraft) {
    return NextResponse.json({ comments: [] });
  }

  const all = await prisma.comment.findMany({
    where: { entryId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  // Build tree: any comment with a valid parentId hangs under its parent
  const map = new Map<string, CommentRow>();
  const roots: CommentRow[] = [];

  for (const c of all) {
    map.set(c.id, {
      id: c.id,
      selectedText: c.selectedText,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: { id: c.author.id, display: maskEmail(c.author.email) },
      parentId: c.parentId,
      replies: [],
    });
  }

  for (const c of all) {
    const row = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(row);
    } else {
      roots.push(row);
    }
  }

  return NextResponse.json({ comments: roots });
}

// ── POST /api/entries/[id]/comments ──
const postSchema = z.object({
  selectedText: z.string().min(1).max(5_000),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  content: z.string().min(1).max(5_000),
  parentId: z.string().optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: entryId } = await ctx.params;

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
      { status: 400 },
    );
  }

  const { selectedText, startOffset, endOffset, content, parentId } =
    parsed.data;

  // Validate offsets
  if (startOffset >= endOffset) {
    return NextResponse.json(
      { error: "无效的文本选择范围" },
      { status: 400 },
    );
  }
  if (endOffset > entry.content.length) {
    return NextResponse.json(
      { error: "选择范围超出正文" },
      { status: 400 },
    );
  }

  // Cross-check selectedText matches the content slice
  const actualText = entry.content.slice(startOffset, endOffset);
  if (actualText !== selectedText) {
    return NextResponse.json(
      { error: "选中文本与服务端不一致，请重新选择" },
      { status: 400 },
    );
  }

  // Validate parent comment if provided
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { entryId: true },
    });
    if (!parent || parent.entryId !== entryId) {
      return NextResponse.json(
        { error: "父评论不存在" },
        { status: 400 },
      );
    }
  }

  const comment = await prisma.comment.create({
    data: {
      entryId,
      authorId: session.user.userId,
      selectedText,
      startOffset,
      endOffset,
      content: content.trim(),
      parentId: parentId ?? null,
    },
    include: {
      author: { select: { id: true, email: true } },
    },
  });

  revalidatePath(`/entries/${entryId}`);

  return NextResponse.json({
    id: comment.id,
    selectedText: comment.selectedText,
    startOffset: comment.startOffset,
    endOffset: comment.endOffset,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    author: {
      id: comment.author.id,
      display: maskEmail(comment.author.email),
    },
    replies: [],
  });
}
