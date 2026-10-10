/**
 * 把自由形状的 JSON 压成单行摘要，用于表格单元格。
 * 完整内容交给 Tooltip / Drawer 展示，列表里只占一行宽度。
 */
export function summariseJson(value: unknown, maxLength = 60): string {
  // 只把 null / undefined / 空串当作"没有内容"。`false` 与 `0` 是合法的 JSON 值，
  // 用 `!value` 判断会连同它们一起吞掉。
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return '-';
  }
  const text = JSON.stringify(value);
  // 函数、Symbol 等序列化结果为 undefined
  if (text === undefined) {
    return '-';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/** 长文正文的格式。由 `detectContentFormat` 推断，决定走哪条渲染通道。 */
export type ContentFormat = 'html' | 'markdown';

/**
 * 已知的 HTML 标签白名单。
 *
 * 不用 `/<\/?[a-z]+>/` 这类泛匹配：正文里出现 `<https://example.com>` 自动链接
 * 或 `<T>` 这类占位写法时，泛匹配会把它们当成标签，从而把整篇 Markdown 误判为
 * HTML —— 结果是源码原样暴露（`#`、`**` 全部可见），比排版塌掉更糟。
 * 白名单覆盖富文本编辑器实际会产出的标签，误判方向单一且可列举。
 */
const HTML_TAG_RE =
  /<\/?(?:div|p|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|br|hr|strong|b|em|i|u|s|del|blockquote|pre|code|span|a|img|figure|figcaption|section|article|header|footer|font|sub|sup|video|audio|source)\b[^>]*>/i;

/**
 * 判断后台维护的长文正文是 HTML 还是 Markdown。
 *
 * 两条正文通道（HTML 富文本、Markdown 源文）共用 `contentHtml` 这一个字段，
 * 字段名只说明「这是正文源码」，没有记录格式 —— 因此渲染前必须在这里推断。
 *
 * 判据是**是否出现已知 HTML 标签**，而不是「像不像 Markdown」：
 * Markdown 语法太宽松（`#`、`-`、`*` 在中文正文里都可能是普通标点），
 * 反向判定会把「以 `#` 开头的普通句子」误当成标题。而 HTML 标签是强特征，
 * 出现了基本可以确定内容就是 HTML。两者都判不出时按 Markdown 处理 ——
 * 纯文本走 Markdown 渲染同样能保留分段，走 HTML 则会把换行全折叠掉。
 */
export function detectContentFormat(content: string | null | undefined): ContentFormat {
  if (!content) {
    return 'markdown';
  }
  return HTML_TAG_RE.test(content) ? 'html' : 'markdown';
}
