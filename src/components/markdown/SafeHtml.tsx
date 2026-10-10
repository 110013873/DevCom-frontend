import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * 富文本正文渲染。
 *
 * 后端有两条正文通道：
 * - **HTML**（`contentHtml`）：新闻正文、协议文本，由后台富文本编辑器产出。
 * - **Markdown**（`content` / `quickStart` / `changelog`）：课节、资源说明。
 *
 * 本组件只负责前者。即便内容来自管理员，也一律当不可信 HTML 处理 ——
 * 一旦某个账号被盗，未净化的 `dangerouslySetInnerHTML` 就是一个持久化的
 * XSS 落点。净化用 DOMPurify 的 HTML 白名单档，不放行脚本、事件属性与
 * `javascript:` 协议。
 */

/** 全站统一的长文排版类。抽成常量，避免各处复制粘贴后逐渐走样。 */
export const PROSE_CLASS =
  'prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground';

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = useMemo(
    () => (html ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) : ''),
    [html]
  );

  if (!sanitized) {
    return null;
  }

  return <div className={cn(PROSE_CLASS, className)} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
