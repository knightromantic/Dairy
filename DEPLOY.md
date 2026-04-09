# 日记站（diary-web）部署流程

本文以 **Vercel（应用）+ Neon（PostgreSQL）** 为主流程，适合个人项目快速上线；其他平台见文末。

---

## 一、部署前你需要准备什么

| 项目 | 说明 |
|------|------|
| 代码托管 | GitHub / GitLab / Bitbucket 任一，供 Vercel 拉取代码 |
| 数据库 | **必须 PostgreSQL**（SQLite 不适合 Vercel 无持久磁盘环境） |
| 账号 | [Vercel](https://vercel.com)、[Neon](https://neon.tech)（或同类 Postgres 托管） |

仓库结构说明：

- 若 Git 仓库**根目录就是** `diary-web`（即 `package.json` 在仓库根）：Vercel 根目录选默认即可。
- 若仓库根是 `FirstDemo`，而项目在子目录 `diary-web`：在 Vercel 项目设置里把 **Root Directory** 设为 `diary-web`。

---

## 二、第一步：创建 PostgreSQL（以 Neon 为例）

1. 打开 [https://console.neon.tech](https://console.neon.tech) 并登录。
2. 创建 **Project**，区域选离用户较近的区域即可。
3. 在 Dashboard 里找到 **Connection string**（或 “Connect”），复制 **带密码** 的 URI。  
   - 格式类似：`postgresql://用户名:密码@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`  
   - **务必保留** `?sslmode=require`（或 Neon 提供的完整参数），否则在 Vercel 上可能连不上。
4. 把这一整串保存好，下一步填到 Vercel 环境变量 **`DATABASE_URL`** 里。  
   - Neon 的库是空库即可，**表结构由首次部署时的 Prisma 迁移自动创建**，无需在控制台手动建表。

---

## 三、第二步：把代码推到 Git

在项目目录（`diary-web`）确认能本地构建（可选，见第六节本地检查）：

```bash
git init
git add .
git commit -m "Initial diary-web"
```

在 GitHub 新建仓库后：

```bash
git remote add origin https://github.com/你的用户名/你的仓库.git
git branch -M main
git push -u origin main
```

---

## 四、第三步：在 Vercel 创建项目

1. 登录 [Vercel](https://vercel.com) → **Add New… → Project**。
2. **Import** 你的 Git 仓库。
3. **Configure Project**：
   - **Framework Preset**：应自动识别为 **Next.js**。
   - **Root Directory**：若应用在子目录，设为 `diary-web`。
   - **Build Command**：本仓库已配置 `vercel.json`，会使用  
     `npm run vercel-build`  
     等价于：`prisma migrate deploy && prisma generate && next build`  
     即：**部署时自动执行数据库迁移并再构建 Next.js**。
   - **Output Directory**：保持默认（Next.js 由框架处理）。
4. 暂勿点 Deploy，先配环境变量（下一步）。

---

## 五、第四步：配置环境变量（必做）

在 Vercel 项目 → **Settings → Environment Variables** 中新增以下变量（**Production、Preview 建议都勾选**，至少 Production 要有）：

| 变量名 | 作用 | 示例或说明 |
|--------|------|------------|
| `DATABASE_URL` | Prisma 连接数据库 | Neon 复制的完整 URI |
| `SESSION_SECRET` | 加密会话 Cookie，**至少 32 字符** | 用随机生成器生成一长串 |
| `APP_BASE_URL` | 验证邮件里的链接前缀、重定向基准 | 先发版：`https://你的项目名.vercel.app` |
| `SKIP_EMAIL_VERIFICATION` | 先发版跳过邮箱验证 | 设为 `true`；接入真实邮件后改为 `false` 或删除 |

可选（**开启真实邮箱验证时**再配）：

| 变量名 | 说明 |
|--------|------|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 见根目录 `.env.example` |
| `SMTP_SECURE` | 视邮箱服务商要求，常见为 `false`（587 STARTTLS） |

注意：

- 首次部署若还没有自定义域名，`APP_BASE_URL` 请与 Vercel 分配的 **`.vercel.app` 域名** 完全一致（建议用 `https://`，无末尾 `/`）。
- 以后绑定自己的域名后，把 `APP_BASE_URL` 改成 `https://你的域名`，并 **Redeploy** 一次。

配置完成后点击 **Deploy**。

---

## 六、第五步：首次部署与验证

1. 等待 Build 日志跑完。  
   - 若失败，在 **Build Logs** 里查看：  
     - **`prisma migrate deploy` 报错**：多数是 `DATABASE_URL` 错误、未开通公网、或 SSL 参数缺失。  
     - **连接超时**：检查 Neon 是否允许 Vercel 区域访问（Neon 默认可公网）。

2. 部署成功后浏览器打开你的 `https://xxx.vercel.app`。

3. 建议走一遍：

   - 注册 → 登录（若 `SKIP_EMAIL_VERIFICATION=true`，注册后可直接登录）。  
   - 写一篇日记 → 首页是否出现 → 打开详情 → 段落评论是否正常。

---

## 七、本地与线上一致性（可选自查）

在 **本机**（需已安装 Node.js）：

1. `.env` 中填写与线上一致的 `DATABASE_URL`（可用 Neon 的同一串或单独 Dev 分支）。
2. 首次同步表结构：

   ```bash
   npx prisma migrate deploy
   ```

3. 本地运行：

   ```bash
   npm install
   npm run dev
   ```

说明：

- 本地 **`npm run build`** 不会执行 `migrate deploy`，避免没有数据库时打包失败。  
- 线上 **`vercel-build`** 会执行 `migrate deploy`，保证迁移在构建阶段应用到生产库。

---

## 八、自定义域名（可选）

1. Vercel 项目 → **Settings → Domains** → 添加你的域名并按提示配置 DNS。  
2. 生效后把环境变量 **`APP_BASE_URL`** 改为 `https://你的域名`。  
3. **Deployments** 里对最新一次 **Redeploy**，使新 `APP_BASE_URL` 生效。

---

## 九、第二阶段：从“跳过验证”改为“真实邮箱验证”

1. 在邮件服务商（企业邮箱、SendGrid、Resend + SMTP 等）准备好发信账号。  
2. 在 Vercel 配置 `SMTP_*` 变量（与本地 `.env.example` 一致）。  
3. 将 **`SKIP_EMAIL_VERIFICATION`** 设为 **`false`** 或 **删除该变量**。  
4. **Redeploy**。  
5. 新用户注册应收到邮件；老用户在“跳过验证”期间注册、已 `emailVerified=true`/**跳过流程创建的账号** 不受影响。

---

## 十、常见问题

**Q：Build 报错 `P1001` / 连不上数据库**  
- 检查 `DATABASE_URL` 是否完整、密码是否转义正确、Neon 项目是否活跃。

**Q：登录后一刷新就退出**  
- 检查 `SESSION_SECRET` 是否在 Vercel 里已设置且长度足够。  
- 生产环境使用 HTTPS（Vercel 默认有），Cookie 为 Secure，不要用 http 访问线上域名测试。

**Q：迁移冲突或改表**  
- 应用结构变更应在本地用 `prisma migrate dev` 生成新迁移并提交；部署时 `migrate deploy` 会自动应用新迁移。不要在生产库上手动改表结构与迁移历史不一致。

---

## 十一、其他托管方式（简要）

| 平台 | 思路 |
|------|------|
| **Railway / Render** | 同时部署 Web 与 Postgres 插件，设置同款环境变量；构建命令仍可用 `npm run vercel-build` 或等价 `migrate deploy && next build`。 |
| **自建 VPS** | `git pull` → `npm ci` → `npx prisma migrate deploy` → `npm run build` → `npm run start`（或用 PM2）；前置反向代理与 HTTPS。 |

更细碎的平台差异以各官方文档为准；环境变量与迁移顺序与本文 **第四节、五节** 一致即可。

---

## 十二、清单（复制自用）

- [ ] Neon（或其它）已创建 Postgres，`DATABASE_URL` 已复制  
- [ ] 代码已 push 到 Git  
- [ ] Vercel Import 仓库，Root Directory 正确（若在子目录）  
- [ ] 已设置：`DATABASE_URL`、`SESSION_SECRET`、`APP_BASE_URL`、`SKIP_EMAIL_VERIFICATION`（按需）  
- [ ] 首次 Deploy 成功，网站可打开  
- [ ] 注册 / 登录 / 写日记 / 评论 自测通过  
- [ ] （可选）自定义域名 + 更新 `APP_BASE_URL` + Redeploy  
- [ ] （稍后）SMTP + 关闭 `SKIP_EMAIL_VERIFICATION`
