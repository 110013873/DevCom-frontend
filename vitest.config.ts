import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * 测试配置与 `vite.config.ts` 分开。
 *
 * 构建侧那份插件（图片优化、gzip/brotli 压缩、manualChunks）对单测毫无意义，
 * 反而会在每次跑测试时多花几秒做无用的压缩。这里只保留测试真正需要的：
 * React 转换、路径别名、jsdom 环境。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // 测试文件散落在被测源码旁边，避免 __tests__ 目录与实际代码脱节
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    // CI 下输出 JUnit 供流水线归档；本地跑测试时不起作用
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './var-test/junit.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/components/ui/**',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        // 门槛先落在核心逻辑上，随各模块补齐逐步抬升。
        // 不设全局 80% 是为了不逼着后来者为纯展示组件写无意义的快照测试。
        'src/lib/**': { statements: 80, branches: 70, functions: 80, lines: 80 },
      },
    },
  },
});
