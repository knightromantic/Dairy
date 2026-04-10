"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { splitIntoParagraphs } from "@/lib/paragraphs";

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
        用空行（两段之间留一空行）分段，读者可在每一段下评论。
      </p>

      <div className="editor-shell">
        <div className="card editor-card">
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

                let data: any = null;
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

            <label htmlFor="content">正文</label>
            <textarea
              id="content"
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"建议结构：\n\n第一段：今天发生了什么\n\n第二段：你的感受/反思\n\n第三段：明天想做什么"}
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

        <aside className="card preview-card">
          <h2 className="preview-title">分段预览</h2>
          {(() => {
            const ps = splitIntoParagraphs(content.trim());
            const list = ps.length > 0 ? ps : content.trim() ? [content.trim()] : [];
            if (list.length === 0) {
              return <p className="page-sub" style={{ marginBottom: 0 }}>开始输入正文后，这里会按空行预览段落。</p>;
            }
            return (
              <div>
                {list.slice(0, 8).map((p, i) => (
                  <div key={i} className="preview-para">
                    <div className="preview-label">第 {i + 1} 段</div>
                    <p className="preview-text">{p}</p>
                  </div>
                ))}
                {list.length > 8 ? (
                  <p className="hint" style={{ margin: "0.5rem 0 0" }}>
                    仅预览前 8 段（共 {list.length} 段）。
                  </p>
                ) : null}
              </div>
            );
          })()}
        </aside>
      </div>
    </>
  );
}
