import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, GraduationCap, Package, Search as SearchIcon } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader, EmptyState, ErrorState } from '@/components/common/PageStates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { searchApi } from '@/api/search';
import { queryKeys } from '@/lib/queryKeys';
import { ApiError } from '@/lib/http';
import { toPlainText } from '@/lib/text';
import type { SearchGroupKey, SearchResult } from '@/types/content';
import { cn } from '@/lib/utils';

/** 后端要求关键词至少 2 个字符，少于此长度直接返回 400。 */
const MIN_KEYWORD_LENGTH = 2;

const GROUP_LABELS: Record<SearchGroupKey, string> = {
  news: '资讯',
  resource: '资源',
  course: '课程',
};

const GROUP_ICONS: Record<SearchGroupKey, typeof FileText> = {
  news: FileText,
  resource: Package,
  course: GraduationCap,
};

const GROUP_ORDER: SearchGroupKey[] = ['news', 'resource', 'course'];

/**
 * 全站搜索。
 *
 * 关键词是唯一的查询状态，放在 URL 上（`/search?keyword=xxx&scope=news`）而不是
 * 组件内 state —— 搜索结果页经常被复制粘贴分享，刷新后必须还原。
 *
 * 输入框与 URL 之间没有防抖：搜索是**提交式**的（回车或点按钮才请求），
 * 不像资源/课程列表那样边打边筛，因此不需要延迟。
 */
export default function SearchResultPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const keyword = (params.get('keyword') ?? '').trim();
  const scope = (params.get('scope') as SearchGroupKey | null) ?? null;

  const [input, setInput] = useState(keyword);

  // URL 变化（后退、外链进入）时回填输入框。
  useEffect(() => {
    setInput(keyword);
  }, [keyword]);

  const canSearch = keyword.length >= MIN_KEYWORD_LENGTH;

  const searchQuery = useQuery({
    queryKey: queryKeys.search(keyword),
    queryFn: () => searchApi.search(keyword),
    enabled: canSearch,
    retry: false,
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = input.trim();
    const search = new URLSearchParams();
    if (next) {
      search.set('keyword', next);
    }
    if (scope) {
      search.set('scope', scope);
    }
    setParams(search);
  };

  /** 切换分组只改 scope，不重新搜索。 */
  const setScope = (next: SearchGroupKey | null) => {
    const search = new URLSearchParams(params);
    if (next && next !== scope) {
      search.set('scope', next);
    } else {
      search.delete('scope');
    }
    setParams(search);
  };

  const data: SearchResult | undefined = searchQuery.data;
  const visibleGroups = scope ? GROUP_ORDER.filter(key => key === scope) : GROUP_ORDER;

  return (
    <>
      <SEOHead
        title={keyword ? `搜索「${keyword}」` : '搜索'}
        description="在 TileLang for RISC-V 社区中检索资讯、资源与课程。"
      />

      <PageHeader title="全站搜索" description="一次检索资讯、资源与课程" />

      <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:px-6 md:py-14">
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              placeholder="输入关键词，至少 2 个字…"
              className="pl-9"
              aria-label="搜索关键词"
              onChange={event => setInput(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={input.trim().length < MIN_KEYWORD_LENGTH}>
            搜索
          </Button>
        </form>

        {!canSearch && (
          <p className="mt-4 text-sm text-muted-foreground">
            {keyword ? `「${keyword}」太短了，请输入至少 ${MIN_KEYWORD_LENGTH} 个字符。` : '输入关键词开始搜索。'}
          </p>
        )}

        {canSearch && searchQuery.isLoading && (
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3].map(index => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {canSearch && searchQuery.isError && (
          <div className="mt-8">
            <ErrorState
              message={
                searchQuery.error instanceof ApiError
                  ? searchQuery.error.message
                  : '搜索失败，请稍后重试'
              }
              onRetry={() => void searchQuery.refetch()}
            />
          </div>
        )}

        {canSearch && data && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScope(null)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  scope === null
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                全部（{data.total}）
              </button>
              {GROUP_ORDER.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    scope === key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {GROUP_LABELS[key]}（{data.groups[key]?.total ?? 0}）
                </button>
              ))}
            </div>

            {data.total === 0 ? (
              <div className="mt-8">
                <EmptyState title="没有找到相关内容" description="换个关键词试试，或减少限定词。" />
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {visibleGroups.map(key => {
                  const group = data.groups[key];
                  if (!group || group.items.length === 0) {
                    return null;
                  }
                  const Icon = GROUP_ICONS[key];
                  return (
                    <section key={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">{GROUP_LABELS[key]}</h2>
                        <Badge variant="secondary">{group.total}</Badge>
                      </div>

                      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
                        {group.items.map(hit => (
                          <li key={`${key}-${hit.id}`}>
                            <Link
                              to={hit.url}
                              className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-elevated"
                            >
                              {hit.coverImage && (
                                <img
                                  src={hit.coverImage}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                                />
                              )}
                              <div className="min-w-0">
                                <h3 className="line-clamp-2 text-sm font-medium text-foreground">{hit.title}</h3>
                                {/* 课程命中的 summary 是富文本简介，去掉标签再展示 */}
                                {hit.summary && (
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {toPlainText(hit.summary, 140)}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>

                      {group.total > group.items.length && (
                        <button
                          type="button"
                          onClick={() => setScope(key)}
                          className="mt-2 text-xs font-medium text-primary transition-colors hover:text-primary-light"
                        >
                          查看全部 {group.total} 条{GROUP_LABELS[key]}结果
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!keyword && (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              也可以直接浏览
              <button
                type="button"
                className="mx-1 font-medium text-primary transition-colors hover:text-primary-light"
                onClick={() => navigate('/news')}
              >
                资讯
              </button>
              、
              <button
                type="button"
                className="mx-1 font-medium text-primary transition-colors hover:text-primary-light"
                onClick={() => navigate('/resources')}
              >
                资源
              </button>
              与
              <button
                type="button"
                className="mx-1 font-medium text-primary transition-colors hover:text-primary-light"
                onClick={() => navigate('/courses')}
              >
                课程
              </button>
              。
            </p>
          </div>
        )}
      </div>
    </>
  );
}
