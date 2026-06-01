"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ── types ──

type Author = { id: string; display: string };

export type EntryJson = {
  id: string;
  title: string;
  content: string;
  isDraft: boolean;
  createdAt: string;
  author: Author;
};

export type CommentRow = {
  id: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  content: string;
  createdAt: string;
  author: Author;
  parentId: string | null;
  replies: CommentRow[];
};

type EntryDetailProps = {
  entryId: string;
  initialEntry?: EntryJson | null;
  initialComments?: CommentRow[];
  initialMe?: { userId: string } | null;
};

// ── helpers ──

/** Walk text nodes in `container`, return absolute character offset for (node, offsetInNode). */
function getAbsoluteOffset(
  container: HTMLElement,
  node: Node,
  offsetInNode: number,
): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current = 0;
  let t: Text | null;
  while ((t = walker.nextNode() as Text | null)) {
    if (t === node) return current + offsetInNode;
    current += t.length;
  }
  return current;
}

/** Collect (start, end, comments) segments from a flat list of top-level comments, merging overlaps. */
type HighlightSegment = {
  start: number;
  end: number;
  comments: CommentRow[];
};

function buildHighlightSegments(comments: CommentRow[]): HighlightSegment[] {
  const intervals: { start: number; end: number; c: CommentRow }[] = [];
  for (const c of comments) {
    if (c.startOffset < c.endOffset) {
      intervals.push({ start: c.startOffset, end: c.endOffset, c });
    }
  }
  intervals.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: HighlightSegment[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
      last.comments.push(iv.c);
    } else {
      merged.push({ start: iv.start, end: iv.end, comments: [iv.c] });
    }
  }
  return merged;
}

/** Split content string into an array of {text, isHighlight, comments?} by highlight segments. */
type TextChunk = {
  text: string;
  highlight: boolean;
  comments?: CommentRow[];
};

function chunkContent(
  content: string,
  segments: HighlightSegment[],
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let cursor = 0;
  for (const seg of segments) {
    if (seg.start > cursor) {
      chunks.push({ text: content.slice(cursor, seg.start), highlight: false });
    }
    chunks.push({
      text: content.slice(seg.start, seg.end),
      highlight: true,
      comments: seg.comments,
    });
    cursor = seg.end;
  }
  if (cursor < content.length) {
    chunks.push({ text: content.slice(cursor), highlight: false });
  }
  return chunks;
}

// ── Floating comment form ──

function FloatingCommentForm({
  entryId,
  selectedText,
  startOffset,
  endOffset,
  position,
  onPosted,
  onClose,
}: {
  entryId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  position: { top: number; left: number };
  onPosted: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="float-comment" style={{ top: position.top, left: position.left }}>
      <div className="float-comment-header">
        <span className="float-comment-quote">
          「{selectedText.length > 60 ? selectedText.slice(0, 60) + "…" : selectedText}」
        </span>
        <button type="button" className="float-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setBusy(true);
          try {
            const r = await fetch(`/api/entries/${entryId}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ selectedText, startOffset, endOffset, content: text }),
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
          placeholder="写下对这一段的评论…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <div className="float-comment-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "发送中…" : "发表"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Reply form (small, inline) ──

function ReplyForm({
  entryId,
  parentId,
  selectedText,
  startOffset,
  endOffset,
  onPosted,
}: {
  entryId: string;
  parentId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  onPosted: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="reply-toggle" onClick={() => setOpen(true)}>
        回复
      </button>
    );
  }

  return (
    <form
      className="reply-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setBusy(true);
        try {
          const r = await fetch(`/api/entries/${entryId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              selectedText,
              startOffset,
              endOffset,
              content: text,
              parentId,
            }),
          });
          const data = await r.json();
          if (!r.ok) {
            setErr(typeof data.error === "string" ? data.error : "发送失败");
            return;
          }
          setText("");
          setOpen(false);
          onPosted();
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <p className="error" style={{ margin: 0 }}>{err}</p> : null}
      <textarea
        placeholder="写下回复…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        rows={2}
      />
      <div className="reply-actions">
        <button className="btn btn-sm" type="submit" disabled={busy}>
          {busy ? "…" : "回复"}
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </form>
  );
}

// ── Comment tree renderer ──

function CommentTree({
  comments,
  entryId,
  selectedText,
  startOffset,
  endOffset,
  me,
  onPosted,
  depth,
}: {
  comments: CommentRow[];
  entryId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  me: { userId: string } | null | undefined;
  onPosted: () => void;
  depth: number;
}) {
  return (
    <>
      {comments.map((c) => (
        <div
          key={c.id}
          className="comment-item"
          style={{ marginLeft: depth > 0 ? `${Math.min(depth * 16, 48)}px` : 0 }}
        >
          <span className="comment-author">{c.author.display}</span>
          <span className="comment-time">
            {new Date(c.createdAt).toLocaleString("zh-CN")}
          </span>
          <p className="comment-body">{c.content}</p>

          {me ? (
            <ReplyForm
              entryId={entryId}
              parentId={c.id}
              selectedText={selectedText}
              startOffset={startOffset}
              endOffset={endOffset}
              onPosted={onPosted}
            />
          ) : null}

          {c.replies.length > 0 && (
            <CommentTree
              comments={c.replies}
              entryId={entryId}
              selectedText={selectedText}
              startOffset={startOffset}
              endOffset={endOffset}
              me={me}
              onPosted={onPosted}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}

// ── Main component ──

export function EntryDetail({
  entryId,
  initialEntry = null,
  initialComments = [],
  initialMe,
}: EntryDetailProps) {
  const [entry, setEntry] = useState<EntryJson | null>(initialEntry);
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<{ userId: string } | null | undefined>(initialMe);
  const [deleting, setDeleting] = useState(false);

  // Selection / floating form state
  const [selText, setSelText] = useState("");
  const [selStart, setSelStart] = useState(0);
  const [selEnd, setSelEnd] = useState(0);
  const [floatPos, setFloatPos] = useState<{ top: number; left: number } | null>(null);

  // Active highlight segment (for inline comment panel)
  const [activeSegment, setActiveSegment] = useState<HighlightSegment | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

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
    if (!initialEntry) {
      void refreshAll();
    }
  }, [initialEntry, refreshAll]);

  // Build highlight segments from top-level comments
  const segments = useMemo(
    () => buildHighlightSegments(comments),
    [comments],
  );

  const chunks = useMemo(() => {
    if (!entry) return [];
    return chunkContent(entry.content, segments);
  }, [entry, segments]);

  // Handle mouseup for text selection
  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !contentRef.current) {
        setFloatPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!contentRef.current.contains(range.commonAncestorContainer)) return;

      const start = getAbsoluteOffset(contentRef.current, range.startContainer, range.startOffset);
      const end = getAbsoluteOffset(contentRef.current, range.endContainer, range.endOffset);
      if (start >= end) {
        setFloatPos(null);
        return;
      }

      const text = (entry?.content ?? "").slice(start, end);
      setSelText(text);
      setSelStart(start);
      setSelEnd(end);

      const rect = range.getBoundingClientRect();
      setFloatPos({
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(8, rect.left + window.scrollX + rect.width / 2 - 160),
      });
    }, 0);
  }, [entry]);

  // Close floating form on outside click
  useEffect(() => {
    if (!floatPos) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".float-comment")) return;
      if (contentRef.current?.contains(target)) {
        // clicked inside content but not on float form — keep it open
        return;
      }
      setFloatPos(null);
      window.getSelection()?.removeAllRanges();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [floatPos]);

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

      {/* ── Content with highlights ── */}
      {entry.isDraft ? (
        <div className="content-text">{entry.content}</div>
      ) : (
        <>
          <div
            ref={contentRef}
            className="content-text selectable"
            onMouseUp={handleMouseUp}
          >
            {chunks.map((ch, i) =>
              ch.highlight ? (
                <span
                  key={i}
                  className={`content-highlight ${activeSegment?.start === (ch.comments?.[0]?.startOffset ?? -1) ? "active" : ""}`}
                  onClick={() => {
                    if (ch.comments && ch.comments.length > 0) {
                      const seg = segments.find(
                        (s) => s.start === ch.comments![0].startOffset,
                      );
                      if (seg) setActiveSegment(seg);
                    }
                  }}
                >
                  {ch.text}
                </span>
              ) : (
                <span key={i}>{ch.text}</span>
              ),
            )}
          </div>

          {/* ── Floating comment form on selection ── */}
          {floatPos && !activeSegment && (
            <FloatingCommentForm
              entryId={entryId}
              selectedText={selText}
              startOffset={selStart}
              endOffset={selEnd}
              position={floatPos}
              onPosted={() => {
                setFloatPos(null);
                window.getSelection()?.removeAllRanges();
                void refreshAll();
              }}
              onClose={() => {
                setFloatPos(null);
                window.getSelection()?.removeAllRanges();
              }}
            />
          )}

          {/* ── Inline comment panel for active segment ── */}
          {activeSegment && (
            <div className="inline-comment-panel">
              <div className="inline-panel-header">
                <span className="inline-panel-quote">
                  「{activeSegment.comments[0]?.selectedText.slice(0, 80) ?? ""}{activeSegment.comments[0]?.selectedText && activeSegment.comments[0].selectedText.length > 80 ? "…" : ""}」
                </span>
                <span className="inline-panel-count">
                  {activeSegment.comments.length} 条评论
                </span>
                <button
                  type="button"
                  className="float-close"
                  onClick={() => setActiveSegment(null)}
                >
                  ✕
                </button>
              </div>

              <CommentTree
                comments={activeSegment.comments}
                entryId={entryId}
                selectedText={activeSegment.comments[0]?.selectedText ?? ""}
                startOffset={activeSegment.start}
                endOffset={activeSegment.end}
                me={me}
                onPosted={() => void refreshAll()}
                depth={0}
              />

              {me ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <ReplyForm
                    entryId={entryId}
                    parentId=""
                    selectedText={activeSegment.comments[0]?.selectedText ?? ""}
                    startOffset={activeSegment.start}
                    endOffset={activeSegment.end}
                    onPosted={() => void refreshAll()}
                  />
                </div>
              ) : (
                <p className="hint" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                  <Link href="/login">登录</Link>后可发表评论。
                </p>
              )}
            </div>
          )}

          {/* ── Fallback: login prompt when nothing is active ── */}
          {!activeSegment && !floatPos && me === null && (
            <p className="hint" style={{ marginTop: "1rem" }}>
              <Link href="/login">登录</Link>后可选中正文文字进行评论。
            </p>
          )}
        </>
      )}

      <div className="toolbar">
        <Link href="/">返回广场</Link>
      </div>
    </article>
  );
}
