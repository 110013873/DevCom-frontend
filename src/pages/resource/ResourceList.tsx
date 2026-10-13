import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader, EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { TagFilter } from '@/components/common/TagFilter';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { Input } from '@/components/ui/input';
import { resourceApi } from '@/api/resource';
import { resourceTagApi } from '@/api/tag';
import { useDebounce } from '@/hooks/useDebounce';
import {
  RESOURCE_CATEGORY_LABELS,
  type ResourceCategory,
  type ResourceQuery,
  type ResourceSort,
} from '@/types/content';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;
const KEYWORD_DEBOUNCE_MS = 300;

const SORT_OPTIONS: { value: ResourceSort; label: string }[] = [
  { value: 'downloadCount', label: '下载最多' },
  { value: 'ratingAvg', label: '评分最高' },
  { value: 'createTime', label: '最新上架' },
  { value: 'name', label: '名称排序' },
];

const CATEGORY_ENTRIES = Object.entries(RESOURCE_CATEGORY_LABELS) as [ResourceCategory, string][];

/** 从查询串读页码，非法值一律回落到 1，避免把 NaN 传给后端。 */
function readPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

/**
 * 资源列表。
 *
 * 关键词走「输入框本地态 → 防抖 → 写进 URL → 进查询 key」这条链：输入时不
 * 请求，停顿 300ms 才发一次，否则每敲一个字都会打一个列表接口。其余筛选
 * （分类/标签/排序/页码）直接读 URL —— 分享、刷新、后退都能还原。
 *
 * 输入框的本地态与 URL 双向同步：URL 因后退/外链变化时，输入框要跟着回填。
 */
export default function ResourceList() {
  const [params, setParams] = useSearchParams();

  const page = readPage(params.get('page'));
  const keyword = params.get('keyword') ?? '';
  const category = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = (params.get('sort') as ResourceSort | null) ?? 'downloadCount';
  const recommended = params.get('recommended') === 'true';
  const free = params.get('free') === 'true';

  /**
   * 分类词表改版后，旧链接/收藏里的值（如 `?category=toolchain`）仍是合法字符串，
   * 但后端枚举校验会判为非法并整个请求回 400 —— 页面就变成「加载失败」，而用户
   * 只是筛不到东西。这类值不发请求，直接落到空态；地址栏保留原值，便于看出链接过期。
   */
  const categoryIsKnown = category === '' || category in RESOURCE_CATEGORY_LABELS;

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebounce(keywordInput, KEYWORD_DEBOUNCE_MS);

  // URL 回填输入框（后退键、带关键词的外链进入）。
  // 只在 URL 与输入框不一致时同步，避免把用户正在输入的内容覆盖掉。
  useEffect(() => {
    setKeywordInput(prev => (prev === keyword ? prev : keyword));
  }, [keyword]);

  // 防抖值稳定后写回 URL，使关键词可分享、可刷新还原。替换历史记录而非
  // 追加 —— 否则输入十个字就会在历史里留下十条记录。
  useEffect(() => {
    if (debouncedKeyword === keyword) {
      return;
    }
    const next = new URLSearchParams(params);
    if (debouncedKeyword) {
      next.set('keyword', debouncedKeyword);
    } else {
      next.delete('keyword');
    }
    next.delete('page');
    setParams(next, { replace: true });
    // params/setParams 每次渲染都是新引用，纳入依赖会导致无限循环；
    // 这里只关心关键词变化，其余参数在构造 next 时从最新 params 读取。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, keyword]);

  const query = useMemo<ResourceQuery>(
    () => ({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      sort,
      order: sort === 'name' ? 'ASC' : 'DESC',
      ...(keyword ? { keyword } : {}),
      ...(category ? { category } : {}),
      ...(tag ? { tag } : {}),
      ...(recommended ? { recommended: 'true' } : {}),
      ...(free ? { free: 'true' } : {}),
    }),
    [page, sort, keyword, category, tag, recommended, free],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.resources.list(query),
    queryFn: () => resourceApi.list(query),
    // 失效分类不发请求：后端会 400，前端只能显示成「加载失败」，但那不是故障
    enabled: categoryIsKnown,
  });

  const tagsQuery = useQuery({
    queryKey: ['resource-tags', 'hot'],
    queryFn: () => resourceTagApi.hot(20),
    staleTime: 10 * 60 * 1000,
  });

  /** 改筛选条件：空值删除该参数，并统一把页码归 1（新条件下旧页码多半越界）。 */
  const patch = (next: Record<string, string | null>) => {
    const search = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === '') {
        search.delete(key);
      } else {
        search.set(key, value);
      }
    });
    search.delete('page');
    setParams(search);
  };

  const buildTagHref = (tagId: string | null): string => {
    const next = new URLSearchParams(params);
    if (tagId) {
      next.set('tag', tagId);
    } else {
      next.delete('tag');
    }
    next.delete('page');
    return `/resources?${next.toString()}`;
  };

  const filterChip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
    );

  return (
    <>
      <SEOHead
        title="资源中心"
        description="TileLang for RISC-V 社区的资源中心：指令集扩展、AI 编译器与工具链、模型与算子库、仿真平台与技术文档。"
        canonicalUrl="/resources"
      />

      <PageHeader title="资源中心" description="指令集扩展、AI 编译器与工具链、模型与算子库、仿真平台与技术文档，一站式获取" />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keywordInput}
              placeholder="搜索资源名称或简介…"
              className="pl-9"
              aria-label="搜索资源"
              onChange={event => setKeywordInput(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={filterChip(category === '')} onClick={() => patch({ category: null })}>
              全部分类
            </button>
            {CATEGORY_ENTRIES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filterChip(category === value)}
                onClick={() => patch({ category: value })}
              >
                {label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              type="button"
              className={filterChip(recommended)}
              onClick={() => patch({ recommended: recommended ? null : 'true' })}
            >
              推荐
            </button>
            <button type="button" className={filterChip(free)} onClick={() => patch({ free: free ? null : 'true' })}>
              免费
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">排序</span>
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={filterChip(sort === option.value)}
                  onClick={() => patch({ sort: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {listQuery.data && <span className="text-xs text-muted-foreground">共 {listQuery.data.total} 个资源</span>}
          </div>

          {(tagsQuery.data?.length ?? 0) > 0 && (
            <TagFilter tags={tagsQuery.data ?? []} activeId={tag || null} buildHref={buildTagHref} />
          )}
        </div>

        {categoryIsKnown && listQuery.isLoading && <LoadingBlock label="正在加载资源..." />}

        {categoryIsKnown && listQuery.isError && (
          <ErrorState message="资源加载失败，请稍后重试" onRetry={() => void listQuery.refetch()} />
        )}

        {categoryIsKnown && listQuery.data && listQuery.data.items.length === 0 && (
          <EmptyState title="没有找到相关资源" description="换个关键词或分类试试，或清空筛选条件查看全部内容。" />
        )}

        {!categoryIsKnown && (
          <EmptyState title="没有找到相关资源" description="这个分类已不存在，换个分类或清空筛选条件查看全部内容。" />
        )}

        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listQuery.data.items.map(item => (
                <ResourceCard key={item.id} item={item} />
              ))}
            </div>
            <Pager
              className="mt-10"
              page={page}
              pageSize={PAGE_SIZE}
              total={listQuery.data.total}
              onPageChange={next => {
                const search = new URLSearchParams(params);
                search.set('page', String(next));
                setParams(search);
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
