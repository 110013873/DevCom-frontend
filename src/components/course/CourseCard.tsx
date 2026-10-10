import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { COURSE_LEVEL_LABELS, type CourseListItem } from '@/types/content';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  item: CourseListItem;
  className?: string;
}

/** 课程卡片。`duration` 是运营填的自由文本（如「10 天 · 约 20 学时」），原样展示。 */
export function CourseCard({ item, className }: CourseCardProps) {
  return (
    <Link
      to={`/courses/${item.id}`}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]',
        className,
      )}
    >
      <div className="h-40 bg-surface-elevated">
        {item.coverImage ? (
          <OptimizedImage src={item.coverImage} alt={item.title} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">课程</div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{COURSE_LEVEL_LABELS[item.level] ?? item.level}</Badge>
          {item.direction && <Badge variant="outline">{item.direction}</Badge>}
        </div>

        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-foreground">{item.title}</h3>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
          {item.instructor && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {item.instructor}
            </span>
          )}
          {item.duration && <span>{item.duration}</span>}
        </div>
      </div>
    </Link>
  );
}
