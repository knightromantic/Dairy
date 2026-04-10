import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "DiaryFlow — 记录生活，段落留声",
  description: "在线日记与段落评论社区",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main>{children}</main>
		 <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "w9dsbhewxz");
          `}
        </Script>
      </body>
    </html>
  );
}
