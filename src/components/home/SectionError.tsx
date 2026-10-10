import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionErrorProps {
  /** 区块名，用于提示文案 */
  title: string;
  onRetry: () => void;
}

/**
 * 区块级失败降级。
 *
 * 刻意做得很轻 —— 一行提示 + 一个重试。首页是「有几块看几块」的页面，
 * 某一块接口挂了不该占据大半个版面去强调这件事；把版面留给已经取到内容的
 * 区块才是对的。因此这里不用 `ErrorState` 那种居中的大块空态。
 */
export function SectionError({ title, onRetry }: SectionErrorProps) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-destructive/20 bg-destructive/5 px-5 py-4">
        <p className="text-sm text-muted-foreground">「{title}」加载失败</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          重试
        </Button>
      </div>
    </section>
  );
}

export default SectionError;
