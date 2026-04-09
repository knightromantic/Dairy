import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export async function GET() {
  const entries = await prisma.entry.findMany({
    where: { isDraft: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { email: true, id: true } },
    },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      excerpt:
        e.content.length > 200 ? `${e.content.slice(0, 200)}…` : e.content,
      createdAt: e.createdAt.toISOString(),
      author: {
        id: e.author.id,
        display: maskEmail(e.author.email),
      },
    })),
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

const createSchema = z.object({
  title: z.string().min(1, "请填写标题").max(200),
  content: z.string().min(1, "请填写正文").max(50_000),
  isDraft: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const entry = await prisma.entry.create({
    data: {
      title: parsed.data.title.trim(),
      content: parsed.data.content.trim(),
      isDraft: parsed.data.isDraft ?? false,
      authorId: session.user.userId,
    },
  });

  return NextResponse.json({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
  });
}
