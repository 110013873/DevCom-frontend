# DevCom Frontend — RISC-V AI 开发者社区前端

React 18 + TypeScript + Vite + Tailwind v3 + shadcn/ui；后台管理另用 Ant Design。
界面风格与官网 portal 保持一致，但**独立构建、独立部署**，与官网并列运行。

- 开发服务器端口 **8081**（官网前端用 8080）
- 开发期由 Vite 代理 `/v1`、`/static` → `http://localhost:10100`
- 生产由 nginx 反代到后端容器

## 环境要求

- Node.js 18.19.0
- 依赖安装**必须**带 `legacy-peer-deps`。仓库内的 `.npmrc` 已设好该开关，
  不要删 —— Vite 7 的可选 peer 链会让 npm 10 的依赖解析崩溃。

## 快速开始

```bash
npm ci
cp .env.example .env          # 通常保持默认（VITE_API_BASE_URL 留空）
npm run dev                   # http://localhost:8081
```

后端需同时运行在 10100，否则 `/v1` 代理会失败。

## 环境变量

`VITE_*` 变量在**构建期内联**进产物，不是运行时读取的，因此改完必须重新构建。

| 变量 | 说明 |
|---|---|
| `VITE_API_BASE_URL` | API 基地址。**留空**则走同源相对路径（开发由 Vite 代理，生产由 nginx 反代） |
| `VITE_SITE_NAME` | 站点名，用于 SEO 与页脚 |
| `VITE_SITE_URL` | 站点根地址，用于 canonical / OG 标签 |

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（8081） |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 仅类型检查 |
| `npm test` / `test:watch` | Vitest 单次 / 监听 |

## 目录结构

```
src/
├── main.tsx            # HelmetProvider → QueryClientProvider → BrowserRouter → Auth → SiteConfig → App
├── App.tsx             # ScrollToTop + PageTracker + AppRoutes
├── api/                # 按模块拆分的类型化 API 函数（auth/news/resource/admin/...）
├── types/              # 领域类型，与后端 DTO 对齐
├── lib/                # http(axios 实例与 ApiError)、queryKeys、datetime、text、utils
├── contexts/           # AuthContext、SiteConfigContext
├── components/
│   ├── ui/             # shadcn 基础组件
│   ├── layout/         # CommunityLayout / SiteHeader / SiteFooter / AdminLayout
│   ├── common/         # SEOHead、PageStates、LoadingFallback
│   ├── markdown/       # SafeHtml 与 PROSE_CLASS（统一长文排版）
│   └── admin/          # 后台专用：RichTextEditor、ImageUploadField
├── pages/              # 前台页面；pages/admin/ 为后台
├── routes/             # routes.tsx 路由表、guards.tsx（RequireAuth / RequireAdmin）
└── locales/            # zh.ts（首期仅中文，保留字典结构便于日后加 en）
```

## 约定

- **认证**：JWT 存 `localStorage`，键名 **`devcom_token`**；401 时广播 `devcom:auth-expired` 事件
- **路由**：除首页外全部 `lazy`；前台挂在 `CommunityLayout`，后台挂在 `RequireAdmin + AdminThemeProvider + AdminLayout`
- **后台页面house style**：`App as AntdApp` + `useApp()` 取 message；`useQuery` + `keepPreviousData`；筛选在 `<Card title="筛选">`，表格在 `<Card styles={{ body: { padding: 0 } }}>`；每页首个子元素为 `<SEOHead />`
- **长文排版**：统一用 `PROSE_CLASS` 常量，不要各处复制粘贴 Tailwind 类串
- **Markdown/富文本**：渲染前一律经 `SafeHtml`（DOMPurify）消毒

## 部署

```bash
docker build \
  --build-arg VITE_API_BASE_URL= \
  --build-arg VITE_SITE_NAME='RISC-V AI 开发者社区' \
  --build-arg VITE_SITE_URL=https://community.tlaic.ac.cn \
  -t devcom-frontend .

docker run -p 80:80 -p 443:443 \
  -v ./nginx.conf:/etc/nginx/conf.d/default.conf \
  -v ./ssl:/etc/ssl/community.tlaic.ac.cn:ro \
  devcom-frontend
```

Dockerfile 与官网 portal 的有两处**刻意不同**，修改时请保留：

1. **不** `COPY .env .env` —— 环境变量改用 build args 显式传入；
2. 显式 `COPY .npmrc` —— 漏了会在 `npm ci` 阶段崩。

`nginx.conf` 需与后端容器同网络（`devcom-backend:10100`），并已配置 SPA 回退
（`try_files $uri $uri/ /index.html`），否则深链接如 `/news/xxx` 会 404。

CI 见 `.github/workflows/main.yml`：推送 `main` / `develop` 构建并推送镜像到阿里云 ACR。
