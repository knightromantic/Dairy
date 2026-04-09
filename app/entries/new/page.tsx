"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewEntryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const data = await r.json();
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) {
    return <p className="page-sub">检查登录状态…</p>;
  }

  return (
    <>
      <h1 className="page-title">写日记</h1>
      <p className="page-sub">
        用空行（两段之间留一空行）分段，读者可在每一段下评论。
      </p>

      <div className="card" style={{ maxWidth: 720 }}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const r = await fetch("/api/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title, content }),
              });
              const data = await r.json();
              if (!r.ok) {
                setError(
                  typeof data.error === "string"
                    ? data.error
                    : JSON.stringify(data.error)
                );
                return;
              }
              router.push(`/entries/${data.id}`);
              router.refresh();
            } finally {
              setLoading(false);
            }
          }}
        >
          {error ? <p className="error">{error}</p> : null}
          <label htmlFor="title">标题</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
          <label htmlFor="content">正文</label>
          <textarea
            id="content"
            className="large"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="toolbar">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "发布中…" : "发布"}
            </button>
            <Link href="/" className="btn btn-secondary" style={{ lineHeight: 1 }}>
              取消
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
