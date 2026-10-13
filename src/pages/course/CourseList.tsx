import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader, EmptyState, ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Pager } from '@/components/common/Pager';
import { CourseCard } from '@/components/course/CourseCard';
import { Input } from '@/components/ui/input';
import { courseApi } from '@/api/course';
import { useDebounce } from '@/hooks/useDebounce';
import { COURSE_LEVEL_LABELS, type CourseLevel, type CourseQuery } from '@/types/content';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 9;
const KEYWORD_DEBOUNCE_MS = 300;

const LEVEL_ENTRIES = Object.entries(COURSE_LEVEL_LABELS) as [CourseLevel, string][];

/** 从查询串读页码，非法值一律回落到 1，避免把 NaN 传给后端。 */
function readPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

/**
 * 课程列表。
 *
 * 筛选条件（方向关键词、难度、页码）全部放在 URL 上 —— 课程数量不多，用户
 * 更常见的行为是把某个方向的课程列表转发给别人，因此可分享比"状态干净"重要。
 *
 * 输入框与关键词的关系和资源列表一致：本地态即时回显，防抖 300ms 后才写回
 * URL 并触发请求，避免每敲一个字打一次接口。
 */
export default function CourseList() {
  const [params, setParams] = useSearchParams();

  const page = readPage(params.get('page'));
  const direction = params.get('direction') ?? '';
  const level = (params.get('level') as CourseLevel | null) ?? '';

  const [directionInput, setDirectionInput] = useState(direction);
  const debouncedDirection = useDebounce(directionInput, KEYWORD_DEBOUNCE_MS);

  // URL 变化（后退、外链）时回填输入框，但不覆盖用户正在输入的内容。
  useEffect(() => {
    setDirectionInput(prev => (prev === direction ? prev : direction));
  }, [direction]);

  // 防抖值稳定后写回 URL。用 replace 而非 push —— 输入一个字一条历史记录
  // 会让后退键变得不可用。
  useEffect(() => {
    if (debouncedDirection === direction) {
      return;
    }
    const next = new URLSearchParams(params);
    if (debouncedDirection) {
      next.set('direction', debouncedDirection);
    } else {
      next.delete('direction');
    }
    next.delete('page');
    setParams(next, { replace: true });
    // params/setParams 每次渲染都是新引用，纳入依赖会无限循环；构造 next 时
    // 从最新 params 读取，因此这里只关心关键词。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDirection, direction]);

  const query = useMemo<CourseQuery>(
    () => ({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      ...(level ? { level } : {}),
      ...(direction ? { direction } : {}),
    }),
    [page, level, direction],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.courses.list(query),
    queryFn: () => courseApi.list(query),
  });

  /** 改筛选条件：空值删除参数，并统一把页码归 1。 */
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
        title="学习中心"
        description="TileLang for RISC-V 社区的学习中心：从入门到高级的体系化课程，覆盖 RISC-V 架构、AI 推理与工具链实践。"
        canonicalUrl="/courses"
      />

      <PageHeader title="学习中心" description="体系化课程与实战训练，从入门到独立完成项目" />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={directionInput}
              placeholder="按方向筛选，如「AI 推理」「芯片设计」…"
              className="pl-9"
              aria-label="按方向筛选课程"
              onChange={event => setDirectionInput(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">难度</span>
              <button type="button" className={filterChip(level === '')} onClick={() => patch({ level: null })}>
                全部
              </button>
              {LEVEL_ENTRIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filterChip(level === value)}
                  onClick={() => patch({ level: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            {listQuery.data && <span className="text-xs text-muted-foreground">共 {listQuery.data.total} 门课程</span>}
          </div>
        </div>

        {listQuery.isLoading && <LoadingBlock label="正在加载课程..." />}

        {listQuery.isError && <ErrorState message="课程加载失败，请稍后重试" onRetry={() => void listQuery.refetch()} />}

        {listQuery.data && listQuery.data.items.length === 0 && (
          <EmptyState title="没有找到相关课程" description="换个方向或难度试试，或清空筛选条件查看全部课程。" />
        )}

        {listQuery.data && listQuery.data.items.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listQuery.data.items.map(item => (
                <CourseCard key={item.id} item={item} />
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
