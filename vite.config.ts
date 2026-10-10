import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      // 后端 DevCom-backend 默认监听 10100
      "/v1": {
        target: "http://localhost:10100",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:10100",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    ViteImageOptimizer({
      webp: { quality: 80 },
      jpeg: { quality: 80 },
      png: { quality: 80 },
    }),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-editor": ["@wangeditor/editor", "@wangeditor/editor-for-react"],
          "vendor-antd": ["antd", "@ant-design/icons"],
          "vendor-charts": ["recharts"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-carousel": ["embla-carousel-react"],
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge", "zod"],
        },
      },
    },
  },
}));
