import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const url = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const transport = getTransport();

  if (!transport) {
    console.info("[email] 未配置 SMTP，开发环境验证链接：");
    console.info(`  收件人: ${to}`);
    console.info(`  链接: ${url}`);
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "Diary <noreply@local>";

  await transport.sendMail({
    from,
    to,
    subject: "请验证您的邮箱 — 日记站",
    text: `点击以下链接完成验证（24 小时内有效）：\n\n${url}\n`,
    html: `<p>请点击以下链接完成邮箱验证（24 小时内有效）：</p><p><a href="${url}">${url}</a></p>`,
  });
}
