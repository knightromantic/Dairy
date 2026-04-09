import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sendVerificationEmail } from "@/lib/mail";

const bodySchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const normalized = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) {
    return NextResponse.json(
      { error: "该邮箱已被注册" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const skipVerify = process.env.SKIP_EMAIL_VERIFICATION === "true";

  if (skipVerify) {
    await prisma.user.create({
      data: {
        email: normalized,
        passwordHash,
        emailVerified: true,
        verifyToken: null,
        verifyTokenExpires: null,
      },
    });
    return NextResponse.json({
      ok: true,
      message:
        "注册成功，可直接登录（当前已开启 SKIP_EMAIL_VERIFICATION；接入真实邮箱验证后请关闭此开关）",
    });
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.create({
    data: {
      email: normalized,
      passwordHash,
      emailVerified: false,
      verifyToken,
      verifyTokenExpires,
    },
  });

  await sendVerificationEmail(normalized, verifyToken);

  return NextResponse.json({
    ok: true,
    message: "注册成功，请查收邮箱完成验证（未配置 SMTP 时见服务端日志中的链接）",
  });
}
