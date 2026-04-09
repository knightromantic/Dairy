"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Me = { userId: string; email: string } | null;

export function Header() {
  const [me, setMe] = useState<Me | undefined>(undefined);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    const data = await r.json();
    setMe(data.user ?? null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setMe(null);
    window.location.href = "/";
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="logo">
          日记站
        </Link>
        <nav className="nav">
          {me === undefined ? null : me ? (
            <>
              <span className="nav-email">{me.email}</span>
              <Link href="/entries/new">写日记</Link>
              <button type="button" className="link-btn" onClick={() => void logout()}>
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login">登录</Link>
              <Link href="/register" className="nav-cta">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
