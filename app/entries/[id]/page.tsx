import { notFound } from "next/navigation";
import {
  EntryDetail,
  type CommentRow,
  type EntryJson,
} from "@/components/EntryDetail";
import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/mask-email";

type PageProps = { params: Promise<{ id: string }> };

export default async function EntryPage(props: PageProps) {
  const { id } = await props.params;
  const session = await getSession();

  // 并行发起 entry 与 comments 查询，公开日记的常见路径无需串行等待
  const [entry, allComments] = await Promise.all([
    prisma.entry.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true } },
      },
    }),
    prisma.comment.findMany({
      where: { entryId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, email: true } },
      },
    }),
  ]);

  if (!entry || (entry.isDraft && session.user?.userId !== entry.authorId)) {
    notFound();
  }

  const comments = entry.isDraft ? [] : allComments;

  const initialEntry: EntryJson = {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    isDraft: entry.isDraft,
    createdAt: entry.createdAt.toISOString(),
    author: {
      id: entry.author.id,
      display: maskEmail(entry.author.email),
    },
  };

  const initialComments: CommentRow[] = comments.map((c) => ({
    id: c.id,
    paragraphIndex: c.paragraphIndex,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    author: {
      id: c.author.id,
      display: maskEmail(c.author.email),
    },
  }));

  return (
    <EntryDetail
      entryId={id}
      initialEntry={initialEntry}
      initialComments={initialComments}
      initialMe={session.user ? { userId: session.user.userId } : null}
    />
  );
}
