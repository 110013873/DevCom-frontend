import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Package } from 'lucide-react';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { interactionApi } from '@/api/interaction';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import type { MyFavoriteItem } from '@/types/content';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

/**
 * 可按类型筛选的收藏目标。
 *
 * 后端的 `CONTENT_TARGET_TYPES` 还包含 `article`/`topic`/`reply`，但那三类属于
 * 后续阶段、没有对应实体可联，收藏了也只会返回 null 标题。这里只暴露当前
 * 真的能跳转的两类。
 */
const TYPE_FILTERS = [
  { value: '', label: '全部' },
  { value: 'news', label: '资讯' },
  { value: 'resource', label: '资源' },
];

/** 收藏项的前台路径。目标类型未知时不生成链接，避免跳到 404。 */
function favoriteHref(item: MyFavoriteItem): string | null {
  if (item.targetType === 'news') {
    return `/news/${item.targetId}`;
  }
  if (item.targetType === 'resource') {
    return `/resources/${item.targetId}`;
  }
  return null;
}

/**
 * 我的收藏。
 *
 * 被收藏的内容下线或删除后，后端仍返回这条收藏记录，但 `title`/`summary`
 * 等字段为 null。这是**预期行为而非错误**，页面照常列出并标注「内容已下线」，
 * 只有这样用户才知道该收藏还在、可以自己取消，而不是以为收藏丢了。
 *
 * 取消收藏就地完成：集合是服务端的，删掉后失效列表查询即可，不做乐观更新 ——
 * 收藏是低频操作，少一层回滚逻辑比省 200ms 更划算。
 */
export default function Favorites() {
  const [params, setParams] = useSearchParams();

  const targetType = params.get('type') ?? '';
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));

  const listQuery = useQuery({
    queryKey: queryKeys.favorites.list(targetType, page),
    queryFn: () => interactionApi.myFavorites({ ...(targetType ? { targetType } : {}), pageNumber: page, pageSize: PAGE_SIZE }),
  });

  const setType = (next: string) => {
    const search = new URLSearchParams(params);
    if (next) {
      search.set('type', next);
    } else {
      search.delete('type');
    }
    search.delete('page');
    setParams(search);
  };

  const data = listQuery.data;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6 md:py-12">
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map(filter => (
          <button
            key={filter.value || 'all'}
            type="button"
            onClick={() => setType(filter.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              targetType === filter.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {filter.label}
          </button>
        ))}
        {data && <span className="ml-auto text-xs text-muted-foreground">共 {data.total} 条</span>}
      </div>

      <div className="mt-6">
        {listQuery.isLoading && <LoadingBlock label="正在加载收藏..." />}

        {listQuery.isError && <ErrorState message="收藏加载失败，请稍后重试" onRetry={() => void listQuery.refetch()} />}

        {data && data.items.length === 0 && (
          <EmptyState
            title="还没有收藏"
            description="在资讯或资源详情页点击收藏，之后可以在这里快速找回。"
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
              {data.items.map(item => {
                const href = favoriteHref(item);
                const Icon = item.targetType === 'resource' ? Package : FileText;

                return (
                  <li key={item.id} className="flex items-start gap-4 px-4 py-4">
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated">
                        <Icon className="h-5 w-5 text-muted-foreground/60" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link
                          to={href}
                          className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-sm font-medium text-muted-foreground">
                          {item.title ?? '内容已下线'}
                        </p>
                      )}

                      {item.summary && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">收藏于 {formatDateTime(item.createTime)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pager
              className="mt-8"
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={next => {
                const search = new URLSearchParams(params);
                search.set('page', String(next));
                setParams(search);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
