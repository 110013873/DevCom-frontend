import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { Badge } from '@/components/ui/badge';
import { HomeSidebar } from './HomeSidebar';
import { SectionError } from './SectionError';
import { SectionSkeleton } from './SectionSkeleton';
import { formatDate } from '@/lib/datetime';
import { formatCount } from '@/lib/contentLabels';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import type { NewsListItem } from '@/types/content';

interface LatestNewsProps {
  items: NewsListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** 单条动态。行式布局：左侧日期块，右侧正文。 */
function NewsRow({ item }: { item: NewsListItem }) {
  const { newsCategoryLabel } = useSiteConfig();

  return (
    <Link
      to={`/news/${item.id}`}
      className="group flex gap-4 border-b border-border/60 py-5 last:border-b-0"
    >
      {/* 日期块：门户列表靠它对齐「什么时候发生的」，比相对时间更容易扫读 */}
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-elevated">
        <span className="text-[11px] leading-none text-muted-foreground">
          {item.publishedAt ? item.publishedAt.slice(5, 7) : '--'}月
        </span>
        <span className="mt-1 text-lg font-semibold leading-none text-foreground">
          {item.publishedAt ? item.publishedAt.slice(8, 10) : '--'}
        </span>
      </div>

      {item.coverImage && (
        <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-surface-elevated sm:block">
          <OptimizedImage
            src={item.coverImage}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          {item.isFeatured && <Badge>置顶</Badge>}
          {item.category && <Badge variant="secondary">{newsCategoryLabel(item.category)}</Badge>}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {item.title}
        </h3>

        {item.summary && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
          <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
          {item.author && <span>{item.author}</span>}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {formatCount(item.viewCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 最新动态。
 *
 * 主列表 + 右侧栏的两栏结构，窄屏时侧栏落到列表下方。列表刻意用行式紧凑布局
 * 而不是 `NewsCard` 的大卡 —— 门户首页的列表要「扫得动」，6 张大卡会把资源与
 * 课程区块推到第二屏之外，而它们才是首页的转化入口。
 *
 * 判断顺序同 `FeaturedNews`：先加载、再错误、最后为空。
 */
export function LatestNews({ items, isLoading, isError, onRetry }: LatestNewsProps) {
  if (isLoading) {
    return (
      <section className="border-y border-border/60 bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
          <SectionSkeleton variant="row" count={5} />
        </div>
      </section>
    );
  }

  if (isError) {
    return <SectionError title="最新动态" onRetry={onRetry} />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border/60 bg-surface-elevated">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">最新动态</h2>
          <Link
            to="/news"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-light"
          >
            全部资讯
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
          <div className="rounded-[1.25rem] border border-border bg-card px-5 shadow-[var(--shadow-card)] md:px-6">
            {items.map(item => (
              <NewsRow key={item.id} item={item} />
            ))}
          </div>

          <HomeSidebar />
        </div>
      </div>
    </section>
  );
}

export default LatestNews;
