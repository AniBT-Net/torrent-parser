# Torrent Parser

在线解析 / 编辑 `.torrent` 文件的小工具（Vue 3 + Vite）。

**在线使用：** [https://parser.anibt.net/](https://parser.anibt.net/)

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

产物在 `dist/`，可直接部署到任意静态站点托管。

## 部署到 Cloudflare Pages

仓库已对接 Cloudflare Pages。推送到 `main` 后会自动构建部署。

### 推荐构建配置（Dashboard）

| 项 | 值 |
| --- | --- |
| Framework preset | Vue / Vite |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/`（仓库根） |
| Node.js version | `22`（环境变量 `NODE_VERSION=22`） |

### 自定义域名

在 Pages 项目 → **Custom domains** 添加 `parser.anibt.net`。  
域名若已在同一 Cloudflare 账号下，DNS 记录会自动写入。

### 与 GitHub Pages 的区别

旧版为 GitHub Pages 项目站，`base` 为 `/torrent-parser/`。  
现已改为根路径 `/`，适配 `parser.anibt.net` 与 `*.pages.dev`。  
GitHub Pages 工作流已停用，避免两边互相覆盖。

### 本地预览 Pages 产物（可选）

```bash
pnpm build
npx wrangler pages dev dist
```
