"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | Record<string, string[]> | null>(
    null
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <h1 className="page-title">注册</h1>
      <p className="page-sub">使用邮箱注册后即可写日记与评论。</p>

      <div className="card form-card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            setLoading(true);
            try {
              const r = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
              });
              const data = await r.json();
              if (!r.ok) {
                setError(data.error ?? "注册失败");
                return;
              }
              setSuccess(data.message ?? "请登录");
              setEmail("");
              setPassword("");
            } finally {
              setLoading(false);
            }
          }}
        >
          {success ? <p className="success">{success}</p> : null}
          {error ? (
            <p className="error">
              {typeof error === "string"
                ? error
                : JSON.stringify(error)}
            </p>
          ) : null}
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">密码（至少 8 位）</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "提交中…" : "注册"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: "1rem" }}>
          已有账号？<Link href="/login">去登录</Link>
        </p>
      </div>
    </>
  );
}
