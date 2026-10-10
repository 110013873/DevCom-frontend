import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CourseCard } from '@/components/course/CourseCard';
import { SectionError } from './SectionError';
import { SectionSkeleton } from './SectionSkeleton';
import type { CourseListItem } from '@/types/content';

interface PopularCoursesProps {
  items: CourseListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * 精品课程。
 *
 * 复用课程列表页同款 `CourseCard`（等级、方向、讲师、时长都已具备），首页不另造
 * 一套卡片。
 *
 * 标题用「精品课程」而不是「热门课程」：后端课程列表没有热度排序字段，
 * 这里展示的是课程列表的前几门 —— 说「热门」而实际没有热度依据是误导。
 */
export function PopularCourses({ items, isLoading, isError, onRetry }: PopularCoursesProps) {
  if (isLoading) {
    return (
      <section className="border-y border-border/60 bg-surface-elevated">
        <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
          <SectionSkeleton variant="card" count={4} />
        </div>
      </section>
    );
  }

  if (isError) {
    return <SectionError title="精品课程" onRetry={onRetry} />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-border/60 bg-surface-elevated">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">精品课程</h2>
          <Link
            to="/courses"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-light"
          >
            全部课程
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(item => (
            <CourseCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularCourses;
