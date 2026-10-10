import type { ResourceCategory } from '@/types/content';
import { RESOURCE_CATEGORY_LABELS } from '@/types/content';
import type { NewsCategory } from '@/types/config';

/**
 * 内容域的中文展示文案与格式化。
 *
 * 这里放**后端没有提供、只能前端自己维护**的映射，以及跨页面复用的格式化。
 *
 * 注意新闻分类**不在这里**：它的权威来源是后端 `news_categories` 配置
 * （`GET /v1/config`，运营在后台维护），读取走 `useSiteConfig()`。
 * 本文件只保留配置到达前的兜底词表，见下。
 */

/**
 * 新闻分类的**兜底**词表。
 *
 * 权威词表由后端下发（`configService.getPublicConfig()`）。这里存在的唯一理由
 * 是「配置到达之前」和「接口失败时」前台仍要能渲染筛选器 —— 否则新闻列表会先
 * 闪一下只有「全部」的空侧栏，再补出分类。
 *
 * 因此它必须与后端 `component/common/defaultConfigs.ts` 的
 * `DEFAULT_NEWS_CATEGORIES` 保持一致：**改一处要同步改另一处**。
 * 这是全站唯一一处刻意的重复，换来的是后端不可用时前台仍可降级可用。
 */
export const FALLBACK_NEWS_CATEGORIES: NewsCategory[] = [
  { value: 'news', label: '社区动态' },
  { value: 'announcement', label: '公告' },
  { value: 'technology', label: '技术解读' },
  { value: 'ecosystem', label: '生态进展' },
  { value: 'event', label: '活动' },
  { value: 'industry', label: '行业观察' },
];

/** 资源分类的中文名。资源分类后端有枚举校验，未命中说明数据异常，回退原值即可。 */
export function resourceCategoryLabel(category: string | null | undefined): string {
  if (!category) {
    return '';
  }
  return RESOURCE_CATEGORY_LABELS[category as ResourceCategory] ?? category;
}

/** 字节数转可读大小。后端 `size` 已是 number（bigint 列在读出口转过）。 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  // 整数不留小数点，其余保留一位
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded} ${units[unitIndex]}`;
}

/** 大数缩写：12800 → 1.3万。列表里的阅读量/下载量用这个，避免撑破卡片。 */
export function formatCount(count: number | null | undefined): string {
  if (count === null || count === undefined || Number.isNaN(count)) {
    return '0';
  }
  if (count < 10000) {
    return String(count);
  }
  const value = count / 10000;
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}万`;
}

/** 评分展示：4.25 → 4.3。无评分返回 '-'。 */
export function formatRating(avg: number | null | undefined): string {
  if (avg === null || avg === undefined || Number.isNaN(avg) || avg <= 0) {
    return '-';
  }
  return avg.toFixed(1);
}

/** 课程方向标签。后端 `direction` 是自由文本，直接展示。 */
export function directionLabel(direction: string | null | undefined): string {
  return direction?.trim() || '';
}
