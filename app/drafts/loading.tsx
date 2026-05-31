export default function DraftsLoading() {
  return (
    <>
      <h1 className="page-title">我的草稿</h1>
      <p className="page-sub">正在加载…</p>
      <div className="card-list">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card" aria-hidden>
            <div style={{ height: "1.5rem", width: "50%", background: "var(--border)", borderRadius: 6, marginBottom: "0.65rem" }} />
            <div style={{ height: "0.9rem", width: "35%", background: "var(--border)", borderRadius: 4, marginBottom: "0.65rem", opacity: 0.6 }} />
            <div style={{ height: "0.9rem", width: "100%", background: "var(--border)", borderRadius: 4, opacity: 0.4 }} />
          </div>
        ))}
      </div>
    </>
  );
}
