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

  // Build tree from flat list
  const map = new Map<string, CommentRow>();
  const roots: CommentRow[] = [];

  for (const c of allComments) {
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

  for (const c of allComments) {
    const row = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(row);
    } else {
      roots.push(row);
    }
  }

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

  return (
    <EntryDetail
      entryId={id}
      initialEntry={initialEntry}
      initialComments={roots}
      initialMe={session.user ? { userId: session.user.userId } : null}
    />
  );
}
