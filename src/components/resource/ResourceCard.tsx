import { Link } from 'react-router-dom';
import { Download, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { formatCount, formatRating, resourceCategoryLabel } from '@/lib/contentLabels';
import type { ResourceListItem } from '@/types/content';
import { cn } from '@/lib/utils';

interface ResourceCardProps {
  item: ResourceListItem;
  className?: string;
}

/**
 * 资源卡片。
 *
 * `ratingAvg` 后端已把 Postgres numeric 转成 number，这里不再做字符串兜底。
 * 无评分（ratingCount 为 0）时显示「暂无评分」而不是 0.0 —— 0 分和没有评分
 * 是两件事，用同一个数字表达会误导。
 */
export function ResourceCard({ item, className }: ResourceCardProps) {
  return (
    <Link
      to={`/resources/${item.id}`}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]',
        className,
      )}
    >
      <div className="h-36 bg-surface-elevated">
        {item.coverImage ? (
          <OptimizedImage src={item.coverImage} alt={item.name} className="h-36 w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {resourceCategoryLabel(item.category)}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{resourceCategoryLabel(item.category)}</Badge>
          {item.isRecommended && <Badge>推荐</Badge>}
          {item.isFree && <Badge variant="outline">免费</Badge>}
        </div>

        <h3 className="mt-3 line-clamp-1 text-base font-semibold text-foreground">{item.name}</h3>

        {item.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
        )}

        {item.supportedArch && (
          <p className="mt-2 text-xs text-muted-foreground">适用架构：{item.supportedArch}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {formatCount(item.downloadCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {item.ratingCount > 0 ? `${formatRating(item.ratingAvg)}（${item.ratingCount}）` : '暂无评分'}
          </span>
        </div>
      </div>
    </Link>
  );
}
