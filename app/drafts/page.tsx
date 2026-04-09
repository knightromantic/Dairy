import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/get-session";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const drafts = await prisma.entry.findMany({
    where: { authorId: session.user.userId, isDraft: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="page-title">我的草稿</h1>
      <p className="page-sub">草稿仅自己可见，发布后才会出现在广场。</p>

      {drafts.length === 0 ? (
        <div className="card">
          <p>你还没有草稿。</p>
          <div className="toolbar" style={{ marginTop: "1rem" }}>
            <Link href="/entries/new" className="btn">
              去写一篇
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-list">
          {drafts.map((d) => (
            <article key={d.id} className="card">
              <h2>
                <Link href={`/entries/${d.id}`}>{d.title}</Link>
              </h2>
              <div className="card-meta">
                最后修改：{new Date(d.updatedAt).toLocaleString("zh-CN")}
              </div>
              <p className="card-excerpt">
                {d.content.length > 220 ? `${d.content.slice(0, 220)}…` : d.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

