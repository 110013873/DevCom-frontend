import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PagerProps {
  /** 当前页码，从 1 开始 */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * 折叠页码：首末页与当前页 ±1 一定显示，跳过的段落用 `'gap'` 占位。
 * 总页数不多时直接全展开，省掉折叠判断。
 */
function buildPageNumbers(current: number, last: number): (number | 'gap')[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const numbers: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) {
    numbers.push('gap');
  }
  for (let page = start; page <= end; page += 1) {
    numbers.push(page);
  }
  if (end < last - 1) {
    numbers.push('gap');
  }
  numbers.push(last);

  return numbers;
}

/**
 * 中文分页器。
 *
 * 不复用 `ui/pagination`：那套是 shadcn 的展示型原语，文案写死英文
 * 「Previous / Next」，且渲染成 `<a href>`，点击会让整页刷新。这里直接给
 * 按钮，页码状态由调用方持有（本项目统一把页码写进 URL 查询串）。
 */
export function Pager({ page, pageSize, total, onPageChange, className }: PagerProps) {
  const last = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (last <= 1) {
    return null;
  }

  const numbers = buildPageNumbers(page, last);

  return (
    <nav className={cn('flex flex-wrap items-center justify-center gap-1.5', className)} aria-label="分页">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="mr-1 h-4 w-4" />
        上一页
      </Button>

      {numbers.map((value, index) =>
        value === 'gap' ? (
          <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={value}
            variant={value === page ? 'default' : 'outline'}
            size="sm"
            className="min-w-9"
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onPageChange(value)}
          >
            {value}
          </Button>
        ),
      )}

      <Button variant="outline" size="sm" disabled={page >= last} onClick={() => onPageChange(page + 1)}>
        下一页
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </nav>
  );
}
