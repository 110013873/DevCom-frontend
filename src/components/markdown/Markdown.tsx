import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { PROSE_CLASS } from './SafeHtml';

/**
 * Markdown 正文渲染。
 *
 * 插件组合按内容的实际形态定：
 * - `remark-gfm`：表格、任务列表、删除线 —— 课程文档里常见。
 * - `remark-math` + `rehype-katex`：公式。RISC-V / AI 内容里公式密集，
 *   缺了就只能显示 `$...$` 原文。
 * - `rehype-highlight`：代码块高亮，用 highlight.js 的自动语言识别。
 *
 * **不引入 `rehype-raw`**：那会让 Markdown 里的原始 HTML 直通 DOM，等于把
 * 一条注入通道开在管理端内容上。需要富 HTML 的场景走 `SafeHtml`。
 *
 * 渲染是纯函数式的 —— react-markdown 不产生 `dangerouslySetInnerHTML`，
 * 因此不需要再叠一层 DOMPurify。
 */
interface MarkdownProps {
  content: string | null | undefined;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  if (!content?.trim()) {
    return null;
  }

  return (
    <div className={cn(PROSE_CLASS, 'prose-code:before:content-none prose-code:after:content-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 外链一律新窗口打开并带上 noopener —— 社区内容里外链很密集，
          // 不加 rel 会让目标页拿到 window.opener 的控制权
          a: ({ href, children, ...rest }) => {
            const external = /^https?:\/\//i.test(href ?? '');
            return (
              <a
                href={href}
                {...rest}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            );
          },
          // 表格在 prose 下默认铺满，移动端会溢出，包一层横向滚动
          table: ({ children, ...rest }) => (
            <div className="my-6 w-full overflow-x-auto">
              <table {...rest}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
