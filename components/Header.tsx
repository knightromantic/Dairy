"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Me = { userId: string; email: string } | null;

export function Header() {
  // 未拉取会话前视为未登录，避免生产环境 /api/auth/me 失败时导航整块为空
  const [me, setMe] = useState<Me>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (!r.ok) {
        setMe(null);
        return;
      }
      const data = (await r.json()) as { user: Me };
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
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
          {me ? (
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
