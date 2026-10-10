import { useEffect, useState } from 'react';

/**
 * 值防抖。
 *
 * 用在搜索框/关键词筛选上：输入过程中不请求，停顿 `delay` 毫秒后才把稳定值
 * 交给下游（通常是 `useQuery` 的 key）。返回的是**值**而不是回调，
 * 这样下游可以照常依赖它做 `useEffect`/`useMemo` 的判断，不必额外维护 ref。
 *
 * 组件卸载或值再次变化时清掉定时器 —— 否则上一次的定时器会在新值到达后
 * 仍然触发，把旧值写回去。
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
