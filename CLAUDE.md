# Portfolio Site — 肖玉婷 电商编导作品集

## 项目概述

React 个人作品集网站，包含 AI 视频生成工作流（基于 Coze）、视频展示、项目介绍、制作历程等模块。部署在腾讯云 CloudBase。

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 + Framer Motion
- 路由：react-router-dom v7（仅单页 HomePage）
- 图标：lucide-react
- 部署：腾讯云 CloudBase（静态托管 + 云函数）

## 关键架构决策

### 视频生成流程（核心功能）

```
用户输入主题 → 前端直接调用 Coze API (SSE 流式) → 解析视频 URL
  → 尝试 Blob 下载（若 CDN 允许跨域）→ 页面内 <video> 播放
  → 失败则走 Service Worker 代理 (/sw-video?url=...) → 绕过 CORS
  → 失败则显示"在新标签页播放"按钮
```

- **本地开发**：前端 → `/api/workflow`（dev-server.cjs 代理） → Coze API
- **生产环境**：前端直接调用 Coze API（token 在前端代码中，个人站点可接受）
- **Coze Token 在 `src/components/CozeWorkflow.tsx` 顶部常量中**

### 为什么不用 CloudBase SDK

免费套餐限制：
- 不支持添加 Web 安全域名（`OperationDenied.FreePackageDenied`）
- HTTP 访问服务可能有类似限制
- 云函数已部署但无法从浏览器 SDK 调用（`EXCEED_AUTHORITY`）
- 云函数仅作为备用，当前未使用

### Service Worker (`public/sw.js`)

- 代理视频请求绕过跨域限制（SW 无 CORS 限制）
- `skipWaiting()` + `clients.claim()` 实现立即激活
- 拦截路径：`/sw-video?url=<encoded_url>`
- 转发 Range 请求头支持视频拖拽进度条

## 项目结构

```
src/
  components/
    CozeWorkflow.tsx    — AI 视频生成组件（核心，最复杂）
    TextSection.tsx     — 文本+图片展示（支持图文混排、漂浮动画）
    ProductionSteps.tsx — 制作历程步骤卡片
    VideoShowcase.tsx   — 视频展示区
    Navbar.tsx, Footer.tsx, ThankYou.tsx, GlobalToast.tsx
    animations/         — FadeIn, AnimatedBackground
    ImageLightbox.tsx   — 图片灯箱
  pages/
    HomePage.tsx        — 单页应用（所有内容常量在此）
  lib/
    cloudbase.ts        — CloudBase SDK 初始化（当前未使用）
  types/index.ts        — TypeScript 类型定义

cloudfunctions/         — CloudBase 云函数（已部署但未启用 HTTP 触发）
  workflow/index.js     — 代理 Coze API
  video-proxy/index.js  — 视频代理

dev-server.cjs          — 本地开发 API 代理服务器
server.js              — 生产环境 Node.js 服务器（备用于 Zeabur 等 PaaS）
cloudbaserc.json       — CloudBase 项目配置
```

## 部署

### CloudBase（当前生产环境）

- 环境 ID：`test-d2gxosyerbfae7e13`
- 静态托管域名：`https://test-d2gxosyerbfae7e13-1376846217.tcloudbaseapp.com`
- 部署命令：`npm run build && tcb hosting deploy dist --env-id test-d2gxosyerbfae7e13`
- 匿名登录：已在控制台开启
- 注意：CDN 缓存可能导致页面不更新，用无痕模式测试或用 `curl -H "Cache-Control: no-cache"` 验证

### GitHub

- 仓库：`https://github.com/SALABENTO/xyt_portfolio-site`
- 远程：`git@github.com:SALABENTO/xyt_portfolio-site.git`

## 本地开发

```bash
npm install
node dev-server.cjs &    # 启动 API 代理 (端口 8787)
npm run dev              # 启动 Vite 开发服务器
```

Vite 配置了 `/api/*` 代理到 `localhost:8787`。

## 已知问题与改进方向

1. **视频内嵌播放**：依赖 Coze CDN 的 CORS 策略或 Service Worker 代理
   - Coze 签名 URL（含 `x-expires`、`x-signature` 参数）有跨域限制
   - 理想方案：将视频转存到 CloudBase 云存储（同源），需解决云函数调用权限问题
2. **免费套餐限制**：无法添加安全域名、无法配置 HTTP 触发器等
   - 解决方案：升级付费套餐或迁移到支持 HTTP 代理的平台（如 Zeabur）
3. **CloudBase 云函数**：已部署但前端无法调用，需配置 HTTP 访问服务或升级套餐
4. **CDN 缓存**：部署后可能需要等待数分钟，无痕模式可跳过缓存
