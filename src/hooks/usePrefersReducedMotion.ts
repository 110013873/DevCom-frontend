import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** 无 matchMedia 的运行环境（老浏览器、部分测试环境）一律当作「不减少动态」。 */
function getInitial(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/**
 * 系统「减少动态效果」偏好。
 *
 * 首屏的粒子与光晕对前庭敏感人群是真实的困扰，而不只是审美偏好，因此由代码读取
 * 而不是靠 CSS 兜底 —— 粒子是 canvas 绘制的，`@media` 里的 `animation: none`
 * 管不到它，必须在 JS 层面决定是否挂载。
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setPrefersReduced(mql.matches);

    // addEventListener 是现代写法；老 Safari 只有 addListener，走兜底分支
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  return prefersReduced;
}

export default usePrefersReducedMotion;
