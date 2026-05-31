export default function EntryLoading() {
  return (
    <article className="entry-article" aria-hidden>
      <div style={{ height: "2rem", width: "70%", background: "var(--border)", borderRadius: 6, marginBottom: "0.5rem" }} />
      <div style={{ height: "0.9rem", width: "40%", background: "var(--border)", borderRadius: 4, marginBottom: "2rem", opacity: 0.6 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px dashed var(--border)" }}>
          <div style={{ height: "0.9rem", width: "100%", background: "var(--border)", borderRadius: 4, marginBottom: "0.5rem", opacity: 0.4 }} />
          <div style={{ height: "0.9rem", width: "85%", background: "var(--border)", borderRadius: 4, opacity: 0.4 }} />
        </div>
      ))}
    </article>
  );
}
