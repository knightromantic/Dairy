"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  return (
    <>
      <h1 className="page-title">登录</h1>
	  
      <div className="card form-card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const r = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
              });

              let data: any = null;
              try {
                data = await r.json();
              } catch {
                data = null;
              }

              if (!r.ok) {
                const msg =
                  data && typeof data.error === "string"
                    ? data.error
                    : `登录失败（HTTP ${r.status}）`;
                setError(msg);
                return;
              }

              router.push("/");
              router.refresh();
            } catch {
              setError("网络异常或服务端错误，请稍后重试");
            } finally {
              setLoading(false);
            }
          }}
        >
          {error ? <p className="error">{error}</p> : null}
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: "1rem" }}>
          还没有账号？<Link href="/register">去注册</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="page-sub">加载中…</p>}>
      <LoginForm />
    </Suspense>
  );
}
