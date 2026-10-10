import { Skeleton } from '@/components/ui/skeleton';

interface SectionSkeletonProps {
  /** 骨架形态：`card` 卡片网格、`row` 行式列表、`feature` 精选头条布局 */
  variant: 'card' | 'row' | 'feature';
  /** 占位条数 */
  count: number;
}

/**
 * 区块级加载骨架。
 *
 * 三种形态各自贴合它所替代的真实布局，目的是让各区块的高度在加载前后基本一致 ——
 * 骨架比内容矮一大截时，数据到达会把下方内容整体顶下去，用户看到的是页面在跳。
 *
 * `role="status"` 让读屏用户知道「这里在加载」；内部的占位框加 `aria-hidden`，
 * 免得逐个被念出来。
 */
export function SectionSkeleton({ variant, count }: SectionSkeletonProps) {
  if (variant === 'row') {
    return (
      <div className="space-y-4" role="status" aria-label="正在加载">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex gap-4" aria-hidden="true">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'feature') {
    return (
      <div className="grid gap-5 lg:grid-cols-2" role="status" aria-label="正在加载">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="aspect-[16/9] w-full rounded-[1.25rem]" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-5" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-28 w-36 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="正在加载">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3" aria-hidden="true">
          <Skeleton className="h-36 w-full rounded-[1.25rem]" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export default SectionSkeleton;
