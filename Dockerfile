# ─────────────────────────────────────────────────────────────
# 构建阶段
#
# 与 portal-frontend 的 Dockerfile 有两处**刻意不同**：
#   1. 不 `COPY .env .env` —— 环境变量改由 build args 显式传入；
#   2. 显式 COPY .npmrc —— 本工程依赖 legacy-peer-deps=true 才能
#      让 npm ci 跑通（详见 .npmrc 注释），漏了会在 install 阶段崩。
# ─────────────────────────────────────────────────────────────
FROM node:18.19.0-alpine3.17 AS build

WORKDIR /app

# VITE_* 是**构建期内联**的，不是运行时读取：必须在 npm run build
# 之前提供。留空则前端走同源相对路径，由 nginx 反代 /v1、/static。
ARG VITE_API_BASE_URL=""
ARG VITE_SITE_NAME="TileLang for RISC-V 社区"
ARG VITE_SITE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SITE_NAME=$VITE_SITE_NAME \
    VITE_SITE_URL=$VITE_SITE_URL

COPY package.json package-lock.json .npmrc ./
RUN npm ci --unsafe-perm=true

COPY tsconfig*.json ./
COPY *.config.* ./
COPY components.json ./
COPY index.html ./
COPY public/ public/
COPY src/ src/

RUN npm run build

# ─────────────────────────────────────────────────────────────
# 运行阶段
# ─────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# 站点配置 + 全局 http 参数（server_tokens/gzip 等）
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-http.conf /etc/nginx/conf.d/global-http.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
