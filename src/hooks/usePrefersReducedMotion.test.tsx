import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** 用可控的 matchMedia 替身，避免依赖 jsdom 未实现的媒体查询求值。 */
function mockMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  };
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
  return { mql, emit: () => listeners.forEach(cb => cb()) };
}

describe('usePrefersReducedMotion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('系统偏好减少动态时返回 true', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('系统未开启减少动态时返回 false', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('偏好变化时跟随更新', () => {
    const { mql, emit } = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.matches = true;
      emit();
    });

    expect(result.current).toBe(true);
  });

  it('无 matchMedia 的环境下返回 false 而不是崩溃', () => {
    const original = window.matchMedia;
    // @ts-expect-error 刻意移除以实现降级分支
    delete window.matchMedia;

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    window.matchMedia = original;
  });
});
