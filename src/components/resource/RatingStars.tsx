import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RATING_MAX, RATING_MIN } from '@/types/content';

interface RatingStarsProps {
  /** 当前已提交的分数；未评分为 null */
  value: number | null;
  onRate: (score: number) => void;
  disabled?: boolean;
  className?: string;
}

const STARS = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, index) => RATING_MIN + index);

/**
 * 1–5 星评分。
 *
 * 用按钮组而不是可拖拽的星级控件：键盘可直接 Tab 到每一颗星并按回车提交，
 * 无需额外实现方向键逻辑。`aria-label` 给出「评 N 星」的完整语义。
 */
export function RatingStars({ value, onRate, disabled = false, className }: RatingStarsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} role="group" aria-label="资源评分">
      {STARS.map(score => {
        const active = value !== null && score <= value;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            aria-label={`评 ${score} 星`}
            aria-pressed={value === score}
            className={cn(
              'rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500',
            )}
            onClick={() => onRate(score)}
          >
            <Star className={cn('h-5 w-5', active && 'fill-current')} />
          </button>
        );
      })}
    </div>
  );
}
