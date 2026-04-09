"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { splitIntoParagraphs } from "@/lib/paragraphs";

type Author = { id: string; display: string };

type EntryJson = {
  id: string;
  title: string;
  content: string;
  isDraft?: boolean;
  createdAt: string;
  author: Author;
};

type CommentRow = {
  id: string;
  paragraphIndex: number;
  content: string;
  createdAt: string;
  author: Author;
};

export function EntryDetail({ entryId }: { entryId: string }) {
  const [entry, setEntry] = useState<EntryJson | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<{ userId: string } | null | undefined>(
    undefined
  );
  const [deleting, setDeleting] = useState(false);

  const refreshAll = useCallback(async () => {
    const [er, cr, mr] = await Promise.all([
      fetch(`/api/entries/${entryId}`, { credentials: "include" }),
      fetch(`/api/entries/${entryId}/comments`, { credentials: "include" }),
      fetch("/api/auth/me", { credentials: "include" }),
    ]);
    const md = await mr.json();
    setMe(md.user ?? null);

    if (!er.ok) {
      setLoadError("日记不存在或已删除");
      setEntry(null);
      return;
    }
    setEntry(await er.json());
    setLoadError(null);

    if (cr.ok) {
      const cd = await cr.json();
      setComments(cd.comments ?? []);
    }
  }, [entryId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const paragraphs = useMemo(() => {
    if (!entry) return [];
    const parts = splitIntoParagraphs(entry.content);
    return parts.length > 0 ? parts : [entry.content.trim() || ""];
  }, [entry]);

  const byPara = useMemo(() => {
    const m = new Map<number, CommentRow[]>();
    for (const c of comments) {
      const list = m.get(c.paragraphIndex) ?? [];
      list.push(c);
      m.set(c.paragraphIndex, list);
    }
    return m;
  }, [comments]);

  if (loadError) {
    return (
      <>
        <p className="error">{loadError}</p>
        <Link href="/">返回广场</Link>
      </>
    );
  }

  if (!entry) {
    return <p className="page-sub">加载中…</p>;
  }

  return (
    <article className="entry-article">
      <h1 className="entry-title">{entry.title}</h1>
      <div className="entry-meta">
        {entry.author.display} · {new Date(entry.createdAt).toLocaleString("zh-CN")}
        {entry.isDraft ? " · 草稿" : null}
      </div>

      {me && me.userId === entry.author.id ? (
        <div className="toolbar" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={deleting}
            onClick={async () => {
              const ok = window.confirm("确认删除这篇日记？删除后不可恢复。");
              if (!ok) return;
              setDeleting(true);
              try {
                const r = await fetch(`/api/entries/${entryId}`, {
                  method: "DELETE",
                  credentials: "include",
                });
                if (!r.ok) {
                  setLoadError(`删除失败（HTTP ${r.status}）`);
                  return;
                }
                window.location.href = "/";
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "删除中…" : "删除文章"}
          </button>
        </div>
      ) : null}

      {paragraphs.map((text, index) => (
        <section key={index} className="paragraph-block">
          <div className="para-label">第 {index + 1} 段</div>
          <p className="paragraph-text">{text}</p>

          <div className="comment-thread">
            {(byPara.get(index) ?? []).length === 0 ? (
              <p className="empty-thread">这一段还没有评注。</p>
            ) : null}
            {(byPara.get(index) ?? []).map((c) => (
              <div key={c.id} className="comment-item">
                <span className="comment-author">{c.author.display}</span>
                <span className="comment-time">
                  {new Date(c.createdAt).toLocaleString("zh-CN")}
                </span>
                <p className="comment-body">{c.content}</p>
              </div>
            ))}

            {me === undefined ? null : me ? (
              <ParagraphCommentForm
                entryId={entryId}
                paragraphIndex={index}
                onPosted={() => void refreshAll()}
              />
            ) : (
              <p className="hint" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                <Link href="/login">登录</Link>
                后可在此段落下发表评论。
              </p>
            )}
          </div>
        </section>
      ))}

      <div className="toolbar">
        <Link href="/">返回广场</Link>
      </div>
    </article>
  );
}

function ParagraphCommentForm({
  entryId,
  paragraphIndex,
  onPosted,
}: {
  entryId: string;
  paragraphIndex: number;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="comment-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
          const r = await fetch(`/api/entries/${entryId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ paragraphIndex, content: text }),
          });
          const data = await r.json();
          if (!r.ok) {
            setErr(typeof data.error === "string" ? data.error : "发送失败");
            return;
          }
          setText("");
          onPosted();
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <p className="error" style={{ margin: 0 }}>{err}</p> : null}
      <textarea
        placeholder="写下对这一段的想法…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "发送中…" : "发表评论"}
      </button>
    </form>
  );
}
