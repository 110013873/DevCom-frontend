import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * 全局测试环境准备。
 *
 * jsdom 20 只实现了浏览器 API 的一个子集，而 antd 的 Table / Drawer / Tooltip
 * 在挂载时就会用到 `matchMedia` 与 `ResizeObserver`。缺了这两样测试会以
 * "is not a function" 的形式挂在渲染阶段，看不出跟被测代码有什么关系，
 * 所以在这里统一补上。
 */

// ResizeObserver：antd 用它测量表格列宽与浮层定位
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// matchMedia：antd 的响应式断点（Grid / Descriptions 列数）依赖它
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }) satisfies MediaQueryList;
}

// jsdom 不实现滚动；ScrollToTop 等组件会调用它
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
