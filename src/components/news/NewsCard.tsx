import { Link } from 'react-router-dom';
import { Eye, Heart, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { formatDateTime } from '@/lib/datetime';
import { formatCount } from '@/lib/contentLabels';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import type { NewsListItem } from '@/types/content';
import { cn } from '@/lib/utils';

interface NewsCardProps {
  item: NewsListItem;
  className?: string;
}

/**
 * 新闻列表卡片。
 *
 * 只渲染 `summary`——正文是后端富文本产出的 HTML，列表里放它既浪费带宽，
 * 也会让卡片高度失控。封面缺失时该列整块不渲染，文字区自己铺满。
 *
 * 分类名取自 `useSiteConfig()`（后端下发的词表），不是本地常量 ——
 * 运营在后台改了分类名，这里跟着变。
 */
export function NewsCard({ item, className }: NewsCardProps) {
  const { newsCategoryLabel } = useSiteConfig();

  return (
    <article
      className={cn(
        'overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]',
        className,
      )}
    >
      <Link to={`/news/${item.id}`} className="flex flex-col sm:flex-row">
        {item.coverImage && (
          // 固定尺寸的框 + `object-contain`：封面尺寸由运营自由上传，宽高比不统一，
          // `object-cover` 会把两侧（或上下）裁掉，标题/图形被切。留白用底色补齐。
          <div className="bg-surface-elevated sm:w-64 sm:shrink-0">
            <OptimizedImage
              src={item.coverImage}
              alt={item.title}
              className="h-44 w-full object-contain sm:h-full"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            {item.isFeatured && <Badge>置顶</Badge>}
            {item.category && <Badge variant="secondary">{newsCategoryLabel(item.category)}</Badge>}
          </div>

          <h3 className="mt-3 text-base font-semibold leading-snug text-foreground md:text-lg">{item.title}</h3>

          {item.summary && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
            <time dateTime={item.publishedAt}>{formatDateTime(item.publishedAt)}</time>
            {item.author && <span>{item.author}</span>}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(item.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCount(item.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {formatCount(item.commentCount)}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
