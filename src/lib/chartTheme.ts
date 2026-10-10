/**
 * 图表主题。
 *
 * recharts 渲染的是 SVG，颜色必须是**具体字符串**，用不了 Tailwind 的
 * `hsl(var(--x))` 类名。因此在运行时从 `:root` 读同一批 CSS 变量 —— 与
 * `AdminThemeProvider` 给 AntD 注入 token 的方式一致 —— 避免图表里再出现一份
 * 硬编码色板，日后改主题时漏改。
 */

function readHslToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) {
    return fallback;
  }
  // `226 100% 64%` → `hsl(226 100% 64%)`，现代浏览器均支持该写法
  return `hsl(${raw.replace(/\s+/g, ' ')})`;
}

/**
 * 分类色板。
 *
 * 前四个直接取品牌令牌；后四个是为「分类数多于 4」的饼图补的辅助色 —— 色相与
 * 品牌色错开、明度接近，保证同一张图里各扇区可辨识。
 */
export function chartPalette(): string[] {
  return [
    readHslToken('--primary', 'hsl(226 100% 64%)'),
    readHslToken('--cyan', 'hsl(190 95% 55%)'),
    readHslToken('--brand-accent', 'hsl(348 85% 54%)'),
    readHslToken('--primary-light', 'hsl(226 100% 74%)'),
    'hsl(280 80% 62%)',
    'hsl(160 70% 42%)',
    'hsl(38 92% 55%)',
    'hsl(220 15% 62%)',
  ];
}

/** 取色板第 `index` 色，越界则循环，保证任意分类数都有色可用。 */
export function paletteColor(index: number): string {
  const palette = chartPalette();
  return palette[index % palette.length];
}

/** 坐标轴通用样式，省得每个图各写一遍。 */
export function axisProps() {
  return {
    tick: { fontSize: 12, fill: readHslToken('--muted-foreground', 'hsl(220 10% 46%)') },
    tickLine: false,
    axisLine: false,
  };
}

/** 网格线与描边色，与页面 `--border` 保持一致。 */
export function gridColor(): string {
  return readHslToken('--border', 'hsl(220 15% 88%)');
}

/** 浮层提示框的统一样式，直接喂给 recharts 内置 `Tooltip` 的 `contentStyle`。 */
export function tooltipStyle(): { borderRadius: number; border: string; fontSize: number; boxShadow: string } {
  return {
    borderRadius: 8,
    border: `1px solid ${gridColor()}`,
    fontSize: 12,
    boxShadow: '0 4px 16px hsl(220 15% 15% / 0.08)',
  };
}

/** 千分位整数，用于 KPI 与提示框里的精确数字。 */
export function formatInteger(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('zh-CN');
}
