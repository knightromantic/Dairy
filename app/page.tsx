import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/mask-email";

export const dynamic = "force-dynamic";

const getPublicEntries = unstable_cache(
  async () =>
    prisma.entry.findMany({
      where: { isDraft: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: { select: { email: true, id: true } },
      },
    }),
  ["public-entries"],
  { revalidate: 300, tags: ["public-entries"] }
);

export default async function HomePage() {
  const entries = await getPublicEntries();

  return (
    <>
      <h1 className="page-title">广场</h1>
      <p className="page-sub">
        阅读大家的日记；登录后可在文中选中文字留下评注。
      </p>

      {entries.length === 0 ? (
        <div className="card">
          <p>还没有公开日记。登录后，去「写日记」发第一篇吧。</p>
        </div>
      ) : (
        <div className="card-list">
          {entries.map((e) => (
            <article key={e.id} className="card">
              <h2>
                <Link href={`/entries/${e.id}`}>{e.title}</Link>
              </h2>
              <div className="card-meta">
                {maskEmail(e.author.email)} ·{" "}
                {new Date(e.createdAt).toLocaleString("zh-CN")}
              </div>
              <p className="card-excerpt">
                {e.content.length > 220
                  ? `${e.content.slice(0, 220)}…`
                  : e.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
