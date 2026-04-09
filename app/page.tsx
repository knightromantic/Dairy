import Link from "next/link";
import { prisma } from "@/lib/prisma";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

export default async function HomePage() {
  const entries = await prisma.entry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { email: true, id: true } } },
  });

  return (
    <>
      <h1 className="page-title">广场</h1>
      <p className="page-sub">
        阅读大家的日记；登录后可在每一段文字下留下评注。正文用空行分段，评注会挂在对应段落下。
      </p>

      {entries.length === 0 ? (
        <div className="card">
          <p>还没有公开日记。登录并验证邮箱后，去「写日记」发第一篇吧。</p>
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
                {e.content.length > 220 ? `${e.content.slice(0, 220)}…` : e.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
