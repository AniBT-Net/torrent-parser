# Torrent Parser

在线解析 / 编辑 `.torrent` 文件的小工具（Vue 3 + Vite）。

**在线使用：** [https://parser.anibt.net/](https://parser.anibt.net/)

## 性能说明

- 使用浏览器原生 **Web Crypto**（SHA-1 / SHA-256）计算 info hash，不再打包 `crypto-js`
- 使用 `Uint8Array` + 原生 base64，去掉 `buffer` / `path-browserify` polyfill
- 生产构建关闭 Vue DevTools；静态资源按 Vue / bencode 分 chunk，便于缓存
- localStorage 持久化带 debounce，避免编辑大种子时频繁 re-encode

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

## 部署到 Cloudflare

仓库已对接 Cloudflare（Workers 静态资源）。推送到 `main` 后会自动构建部署。

### 推荐构建配置（Dashboard）

| 项 | 值 |
| --- | --- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/`（仓库根） |
| Node.js version | `22`（环境变量 `NODE_VERSION=22`，可选） |

`wrangler.toml` 中 `[assets].directory = "./dist"`，构建产物由此上传。

### 自定义域名

在项目 → **Custom domains** 添加 `parser.anibt.net`。  
域名若已在同一 Cloudflare 账号下，DNS 记录会自动写入。

### 与 GitHub Pages 的区别

旧版为 GitHub Pages 项目站，`base` 为 `/torrent-parser/`。  
现已改为根路径 `/`，适配 `parser.anibt.net`。

### 本地预览（可选）

```bash
pnpm build
npx wrangler dev
```
