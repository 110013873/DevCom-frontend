import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { Badge } from '@/components/ui/badge';
import { SectionError } from './SectionError';
import { SectionSkeleton } from './SectionSkeleton';
import { formatDateTime } from '@/lib/datetime';
import { formatCount } from '@/lib/contentLabels';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import type { NewsListItem } from '@/types/content';

interface FeaturedNewsProps {
  items: NewsListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * 精选头条。
 *
 * 布局是「一主两副」：首条铺一张大卡，其余纵排在右侧。条目不足三条时少渲染几张
 * 小卡即可，不补齐占位 —— 运营只置顶了一条是正常状态。
 *
 * 三条渲染规则的判断顺序不能颠倒：`isLoading` 必须排在「为空」之前，否则首次
 * 加载时 `items` 还是 `undefined`，会先被判成「为空」而整块消失，加载完成再突然出现。
 */
export function FeaturedNews({ items, isLoading, isError, onRetry }: FeaturedNewsProps) {
  const { newsCategoryLabel } = useSiteConfig();

  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
        <SectionSkeleton variant="feature" count={2} />
      </section>
    );
  }

  if (isError) {
    return <SectionError title="精选头条" onRetry={onRetry} />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  const [lead, ...rest] = items;

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">精选头条</h2>
        <Link
          to="/news"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-light"
        >
          全部资讯
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {/* 主卡 */}
        <Link
          to={`/news/${lead.id}`}
          className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]"
        >
          <div className="aspect-[16/9] bg-surface-elevated">
            {lead.coverImage && (
              <OptimizedImage
                src={lead.coverImage}
                alt={lead.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            )}
          </div>

          <div className="flex flex-1 flex-col p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>置顶</Badge>
              {lead.category && <Badge variant="secondary">{newsCategoryLabel(lead.category)}</Badge>}
            </div>

            <h3 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary md:text-xl">
              {lead.title}
            </h3>

            {lead.summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{lead.summary}</p>
            )}

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-xs text-muted-foreground">
              <time dateTime={lead.publishedAt}>{formatDateTime(lead.publishedAt)}</time>
              {lead.author && <span>{lead.author}</span>}
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {formatCount(lead.viewCount)}
              </span>
            </div>
          </div>
        </Link>

        {/* 副卡纵排。无剩余条目时这一列整体不渲染，主卡自然铺满。 */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-5">
            {rest.map(item => (
              <Link
                key={item.id}
                to={`/news/${item.id}`}
                className="group flex flex-1 gap-4 overflow-hidden rounded-[1.25rem] border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]"
              >
                {item.coverImage && (
                  <div className="h-28 w-36 shrink-0 overflow-hidden rounded-xl bg-surface-elevated">
                    <OptimizedImage
                      src={item.coverImage}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                  {item.category && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{newsCategoryLabel(item.category)}</Badge>
                    </div>
                  )}
                  <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                  <time dateTime={item.publishedAt} className="mt-auto pt-3 text-xs text-muted-foreground">
                    {formatDateTime(item.publishedAt)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default FeaturedNews;
