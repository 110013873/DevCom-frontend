import { Link } from 'react-router-dom';
import type { Tag } from '@/types/content';
import { cn } from '@/lib/utils';

/**
 * 标签筛选行。
 *
 * 做成链接而不是受控按钮：筛选状态本来就该进 URL，这样分享/刷新/后退都能还原。
 * `basePath` 决定筛到的地址，`activeId` 为 null 时渲染「全部」。
 */
interface TagFilterProps {
  tags: Tag[];
  activeId: string | null;
  /** 拼接查询串的函数，由调用方决定保留哪些既有参数 */
  buildHref: (tagId: string | null) => string;
  className?: string;
}

export function TagFilter({ tags, activeId, buildHref, className }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
    );

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Link to={buildHref(null)} className={chipClass(activeId === null)}>
        全部标签
      </Link>
      {tags.map(tag => (
        <Link key={tag.id} to={buildHref(tag.id)} className={chipClass(activeId === tag.id)}>
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
