import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader, EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { TagFilter } from '@/components/common/TagFilter';
import { NewsCard } from '@/components/news/NewsCard';
import { newsApi } from '@/api/news';
import { newsTagApi } from '@/api/tag';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { queryKeys } from '@/lib/queryKeys';
import type { NewsQuery, NewsSort } from '@/types/content';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

/** 排序选项：只列出后端白名单里的字段，`value` 直接进查询串。 */
const SORT_OPTIONS: { value: NewsSort; label: string }[] = [
  { value: 'publishedAt', label: '最新发布' },
  { value: 'viewCount', label: '最多阅读' },
];

/** 从查询串读页码，非法值一律回落到 1，避免把 NaN 传给后端。 */
function readPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

/**
 * 新闻列表。
 *
 * 筛选条件（分类 / 标签 / 排序 / 页码）全部存在 URL 查询串里 —— 分享、刷新、
 * 后退都能还原，也不需要在组件间传递状态。改条件时统一走 `setParams`，
 * 顺带把页码重置回第 1 页（否则会在新条件下停留在越界页码上显示空列表）。
 */
export default function NewsList() {
  const [params, setParams] = useSearchParams();
  const { newsCategories } = useSiteConfig();

  const page = readPage(params.get('page'));
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = (params.get('sort') as NewsSort | null) ?? 'publishedAt';

  const query = useMemo<NewsQuery>(
    () => ({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      sort,
      order: 'DESC',
      ...(category ? { category } : {}),
      ...(tag ? { tag } : {}),
    }),
    [page, category, tag, sort],
  );

  const newsQuery = useQuery({
    queryKey: queryKeys.news.list(query),
    queryFn: () => newsApi.list(query),
  });

  const tagsQuery = useQuery({
    queryKey: ['news-tags', 'hot'],
    queryFn: () => newsTagApi.hot(20),
    staleTime: 10 * 60 * 1000,
  });

  /** 保留当前分类/排序，只改一个参数；改筛选条件时页码归 1。 */
  const setParams_ = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    setParams(next);
  };

  const buildTagHref = (tagId: string | null): string => {
    const next = new URLSearchParams(params);
    if (tagId) {
      next.set('tag', tagId);
    } else {
      next.delete('tag');
    }
    next.delete('page');
    return `/news?${next.toString()}`;
  };

  const total = newsQuery.data?.total ?? 0;

  return (
    <>
      <SEOHead
        title="社区资讯"
        description="TileLang for RISC-V 社区的最新动态、技术解读与生态进展。"
        canonicalUrl="/news"
      />

      <PageHeader title="社区资讯" description="掌握 RISC-V 与 AI 领域的最新动态、技术解读与生态进展" />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* 主列表 */}
          <div className="min-w-0 flex-1">
            {newsQuery.isLoading && <LoadingBlock label="正在加载资讯..." />}

            {newsQuery.isError && (
              <ErrorState message="资讯加载失败，请稍后重试" onRetry={() => void newsQuery.refetch()} />
            )}

            {newsQuery.data && newsQuery.data.items.length === 0 && (
              <EmptyState
                title="没有找到相关资讯"
                description="换个分类或标签试试，或清空筛选条件查看全部内容。"
              />
            )}

            {newsQuery.data && newsQuery.data.items.length > 0 && (
              <>
                <div className="space-y-5">
                  {newsQuery.data.items.map(item => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
                <Pager
                  className="mt-10"
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={next => setParams_({ page: String(next) })}
                />
              </>
            )}
          </div>

          {/* 侧栏筛选 */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="sticky top-24 space-y-6">
              <section className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 className="text-sm font-semibold text-foreground">分类</h2>
                {/* 竖排列表（而不是横排药丸）：分类名长短不一，横排换行后会忽长忽短。
                    选中项的竖条做成与整行等高 —— 矮条在小字号行里会显得像标点 */}
                <ul className="mt-3">
                  <li>
                    <button
                      type="button"
                      onClick={() => setParams_({ category: null, page: null })}
                      className={cn(
                        'relative w-full py-2 pl-4 pr-3 text-left text-sm transition-colors',
                        category === ''
                          ? 'bg-primary/10 font-medium text-primary before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      全部新闻
                    </button>
                  </li>
                  {newsCategories.map(option => (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => setParams_({ category: option.value, page: null })}
                        className={cn(
                          'relative w-full py-2 pl-4 pr-3 text-left text-sm transition-colors',
                          category === option.value
                            ? 'bg-primary/10 font-medium text-primary before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 className="text-sm font-semibold text-foreground">排序</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setParams_({ sort: option.value, page: null })}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        sort === option.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              {(tagsQuery.data?.length ?? 0) > 0 && (
                <section className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                  <h2 className="text-sm font-semibold text-foreground">标签</h2>
                  <TagFilter
                    className="mt-3"
                    tags={tagsQuery.data ?? []}
                    activeId={tag || null}
                    buildHref={buildTagHref}
                  />
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
