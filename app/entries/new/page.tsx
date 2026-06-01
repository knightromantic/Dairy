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
  const [submitAsDraft, setSubmitAsDraft] = useState(false);

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
        发布后读者可选中文中任意文字留下评注，你也可以在草稿箱中随时编辑。
      </p>

      <div className="card editor-card" style={{ maxWidth: 680 }}>
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
                body: JSON.stringify({ title, content, isDraft: submitAsDraft }),
              });

              let data: { error?: unknown; id?: string } | null = null;
              try {
                data = await r.json();
              } catch {
                data = null;
              }

              if (!r.ok) {
                setError(
                  data && typeof data.error === "string"
                    ? data.error
                    : "发布失败"
                );
                return;
              }

              if (!data) {
                setError("响应异常");
                return;
              }

              router.push(submitAsDraft ? "/drafts" : `/entries/${data.id}`);
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
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="给今天起个标题…"
            required
          />

          <div style={{ height: "1rem" }} />

          <label htmlFor="content">正文</label>
          <textarea
            id="content"
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今天发生了什么…"
            required
          />
          <div className="toolbar">
            <button
              className="btn"
              type="submit"
              disabled={loading}
              onClick={() => setSubmitAsDraft(false)}
            >
              {loading && !submitAsDraft ? "发布中…" : "发布"}
            </button>
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={loading}
              onClick={() => setSubmitAsDraft(true)}
            >
              {loading && submitAsDraft ? "保存中…" : "保存草稿"}
            </button>
            <Link
              href="/"
              className="btn btn-secondary"
              style={{ lineHeight: 1 }}
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
