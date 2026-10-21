import { detectContentFormat } from '@/lib/text';
import { Markdown } from './Markdown';
import { SafeHtml } from './SafeHtml';

/**
 * 混排正文渲染：先判断内容格式再分发。
 *
 * 有若干字段在不同时期被灌入过两种格式 —— 后台改成 WangEditor 之前它们是
 * Markdown，改完之后是 HTML，而数据库里两种都可能存在。用 `content` 这种
 * 名字说话不说明格式的字段，渲染方必须自己判：
 *
 * - 判为 HTML → `SafeHtml`（DOMPurify 净化后直出）
 * - 否则 → `Markdown`（纯文本走 Markdown 也不会丢分段）
 *
 * 判据见 `detectContentFormat`。不要在这里直接引入 `rehype-raw` 把 Markdown
 * 通道改成能放行 HTML —— 那会绕过 DOMPurify 在 Markdown 侧重开注入通道。
 */
interface RichContentProps {
  content: string | null | undefined;
  className?: string;
}

export function RichContent({ content, className }: RichContentProps) {
  if (!content?.trim()) {
    return null;
  }
  return detectContentFormat(content) === 'html' ? (
    <SafeHtml html={content} className={className} />
  ) : (
    <Markdown content={content} className={className} />
  );
}
