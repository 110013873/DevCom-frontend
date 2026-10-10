import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { SectionError } from './SectionError';
import { SectionSkeleton } from './SectionSkeleton';
import type { ResourceListItem } from '@/types/content';

interface LatestResourcesProps {
  items: ResourceListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * 热门资源。
 *
 * 直接复用 `ResourceCard` —— 它已经带分类徽标、下载计数与评分，首页没有任何理由
 * 再做一套「首页专用」的资源卡：两套卡片会在后续改动里逐渐分叉。
 *
 * 标题用「热门资源」而不是「最新资源」，因为数据实际按下载量倒序（见
 * `useHomeContent`）。说「最新」而按热度排序是口径不一致。
 */
export function LatestResources({ items, isLoading, isError, onRetry }: LatestResourcesProps) {
  if (isLoading) {
    return (
      <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
        <SectionSkeleton variant="card" count={4} />
      </section>
    );
  }

  if (isError) {
    return <SectionError title="热门资源" onRetry={onRetry} />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">热门资源</h2>
        <Link
          to="/resources"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-light"
        >
          全部资源
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(item => (
          <ResourceCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default LatestResources;
