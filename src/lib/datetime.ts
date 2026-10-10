/**
 * 时间展示。
 *
 * 按北京时间（运行时本地时区）展示后端返回的 UTC 时间戳，
 * 强制 24 小时制 —— 社区内容以中文读者为主，`上午/下午` 反而增加阅读成本。
 */

/** 无法解析时统一显示 `-`，避免表格里出现 `Invalid Date` */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

/**
 * 只到日的展示，用于「加入于 2026/3/8」这类不需要时分秒的场景 ——
 * 注册时间精确到秒对读者没有意义，反而让句子变长。
 */
export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('zh-CN');
}
