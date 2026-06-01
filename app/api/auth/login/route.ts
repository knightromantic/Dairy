import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/get-session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// 预计算的 bcrypt dummy hash，用于防御 timing attack 用户枚举
const DUMMY_HASH =
  "$2a$12$LJ3m4ys3GZfnYMz8kVsKAOCqG.6HzEhf5KQvZ6hnG9aGbzJ8EKsVe";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // 始终执行 bcrypt 比较以防御 timing attack：
  // 用户不存在时也对 dummy hash 执行相同耗时的比对
  const passwordValid = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordValid) {
    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.user = { userId: user.id, email: user.email };
  await session.save();

  return NextResponse.json({ ok: true });
}
