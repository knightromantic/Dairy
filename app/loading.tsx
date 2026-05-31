export default function HomeLoading() {
  return (
    <>
      <h1 className="page-title">广场</h1>
      <p className="page-sub">正在加载日记列表…</p>
      <div className="card-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" aria-hidden>
            <div style={{ height: "1.5rem", width: "60%", background: "var(--border)", borderRadius: 6, marginBottom: "0.65rem" }} />
            <div style={{ height: "0.9rem", width: "40%", background: "var(--border)", borderRadius: 4, marginBottom: "0.65rem", opacity: 0.6 }} />
            <div style={{ height: "0.9rem", width: "100%", background: "var(--border)", borderRadius: 4, opacity: 0.4 }} />
            <div style={{ height: "0.9rem", width: "80%", background: "var(--border)", borderRadius: 4, opacity: 0.4, marginTop: "0.35rem" }} />
          </div>
        ))}
      </div>
    </>
  );
}
