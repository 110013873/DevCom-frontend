import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { userApi } from '@/api/auth';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { formatFileSize, resourceCategoryLabel } from '@/lib/contentLabels';
import type { MyDownloadItem } from '@/types/content';

const PAGE_SIZE = 10;

/**
 * 我的下载。
 *
 * 与收藏页的**关键差别**：后端会把「资源已下线/转隐藏/软删」的记录整条滤掉，
 * 所以这里不会出现收藏页那种 `title === null` 的「内容已下线」条目 —— `title`
 * 在类型上可空只是因为版本/文件可能缺失，兜底写成 `-` 即可，不写占位文案。
 *
 * 接口**不返回** `fileId`/`storageKey`/`url`，页面也没有「重新下载」按钮：
 * 文件 id 可以直接换到一次新的下载，回传它等于多出一条绕过下载鉴权与限流的
 * 通路。要再下一次，走资源详情页的正常入口 —— 那里会记新的下载记录，
 * 于是本页也多一条历史，符合直觉。
 */
export default function Downloads() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));

  const listQuery = useQuery({
    queryKey: queryKeys.downloads(page),
    queryFn: () => userApi.downloads({ pageNumber: page, pageSize: PAGE_SIZE }),
  });

  const data = listQuery.data;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 md:px-6 md:py-12">
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">
          下载记录按时间倒序，仅保留仍可访问的资源
        </span>
        {data && <span className="ml-auto text-xs text-muted-foreground">共 {data.total} 条</span>}
      </div>

      <div className="mt-6">
        {listQuery.isLoading && <LoadingBlock label="正在加载下载记录..." />}

        {listQuery.isError && (
          <ErrorState message="下载记录加载失败，请稍后重试" onRetry={() => void listQuery.refetch()} />
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="还没有下载记录"
            description="在资源详情页下载文件后，这里会留下记录，方便你找回用过的版本。"
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <ul className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
              {data.items.map(item => (
                <DownloadRow key={item.id} item={item} />
              ))}
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

/**
 * 单条下载记录。
 *
 * 拆出来只为让主组件保持一屏可读；它没有独立状态，也没有复用点，因此
 * 不做 props 之外的抽象。
 */
function DownloadRow({ item }: { item: MyDownloadItem }) {
  const category = resourceCategoryLabel(item.category);
  // 文件名/架构/大小三者都可以缺：它们是「当时那个文件」的快照，不是资源本身
  const fileMeta = [item.fileName, item.osArch, formatFileSize(item.size)].filter(
    (part): part is string => Boolean(part) && part !== '-',
  );

  return (
    <li className="flex items-start gap-4 px-4 py-4">
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
          <Package className="h-5 w-5 text-muted-foreground/60" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Link
          to={`/resources/${item.targetId}`}
          className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          {item.title ?? '资源已下线'}
        </Link>

        {item.summary && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
        )}

        {fileMeta.length > 0 && (
          <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">{fileMeta.join(' · ')}</p>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          {category && <span className="mr-2">{category}</span>}
          {item.versionName && <span className="mr-2">版本 {item.versionName}</span>}
          下载于 {formatDateTime(item.createTime)}
        </p>
      </div>
    </li>
  );
}
