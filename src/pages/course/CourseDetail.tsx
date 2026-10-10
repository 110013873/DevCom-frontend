import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, ExternalLink, FileText, Lock, PlayCircle, User } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Badge } from '@/components/ui/badge';
import { courseApi } from '@/api/course';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { COURSE_LEVEL_LABELS, LESSON_TYPE_LABELS, type CourseDay, type LessonSummary } from '@/types/content';

/** 课节类型图标。`external` 用外链图标，其余按内容形态区分。 */
function LessonIcon({ type }: { type: LessonSummary['type'] }) {
  const className = 'h-4 w-4 shrink-0 text-muted-foreground';
  if (type === 'video') {
    return <PlayCircle className={className} />;
  }
  if (type === 'external') {
    return <ExternalLink className={className} />;
  }
  return <FileText className={className} />;
}

/**
 * 课程详情。
 *
 * 这里渲染的是**目录**：后端详情接口刻意裁掉了课节正文（`LessonSummary`
 * 不含 `content`），一门课几十节的 Markdown 一次全拉回来会让详情页明显变慢。
 * 正文在 `/learn/:courseId/:lessonId` 按需单取。
 *
 * `external` 类型的课节指向第三方站点，直接新窗口打开，不进学习页 ——
 * 学习页对这类课节只会显示一个跳转按钮，多一跳没有意义。
 */
export default function CourseDetail() {
  const { id = '' } = useParams<{ id: string }>();

  const detailQuery = useQuery({
    queryKey: queryKeys.courses.detail(id),
    queryFn: () => courseApi.detail(id),
    enabled: Boolean(id),
  });

  const course = detailQuery.data;

  /**
   * 有 Day 的课程按 Day 分组展示；课节如果没有归入任何 Day（后端 `dayId` 为
   * null），详情接口会把它们放进扁平的 `lessons` 里，这里单独收一节
   * 「其他课节」，避免这些课节在目录中彻底消失。
   */
  const grouped = useMemo<{ day: CourseDay | null; lessons: LessonSummary[] }[]>(() => {
    if (!course) {
      return [];
    }
    // 显式标注：从 `map` 推出来的是 `day: CourseDay`，后面 push 的孤儿组
    // `day: null` 就塞不进去，类型得标在中间变量上而不是只在返回类型上。
    const days: { day: CourseDay | null; lessons: LessonSummary[] }[] = course.days.map(day => ({
      day,
      lessons: day.lessons,
    }));
    const dayLessonIds = new Set(course.days.flatMap(day => day.lessons.map(lesson => lesson.id)));
    const orphans = course.lessons.filter(lesson => !dayLessonIds.has(lesson.id));
    if (orphans.length > 0) {
      days.push({ day: null, lessons: orphans });
    }
    return days;
  }, [course]);

  if (detailQuery.isLoading) {
    return <LoadingBlock label="正在加载课程..." />;
  }

  if (detailQuery.isError || !course) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-4 py-16 md:px-6">
        <ErrorState
          title="课程不存在或已下线"
          message="该课程可能已被删除，或者尚未公开。"
          onRetry={() => void detailQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link to="/courses" className="text-sm font-medium text-primary transition-colors hover:text-primary-light">
            返回学习中心
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={course.title}
        description={course.description}
        canonicalUrl={`/courses/${course.id}`}
        ogImage={course.coverImage ?? undefined}
      />

      <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:px-6 md:py-14">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回学习中心
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{COURSE_LEVEL_LABELS[course.level] ?? course.level}</Badge>
            {course.direction && <Badge variant="outline">{course.direction}</Badge>}
          </div>

          <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-3xl">
            {course.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {course.instructor && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {course.instructor}
              </span>
            )}
            {course.duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {course.duration}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              共 {course.lessonCount} 节课
            </span>
          </div>
        </header>

        {course.coverImage && (
          <img
            src={course.coverImage}
            alt={course.title}
            loading="lazy"
            decoding="async"
            className="mt-8 aspect-video w-full rounded-[1.25rem] border border-border object-cover"
          />
        )}

        {course.description && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-foreground">课程介绍</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {course.description}
            </p>
          </section>
        )}

        {course.prerequisites && (
          <section className="mt-8 rounded-[1.25rem] border border-border bg-surface-elevated p-5">
            <h2 className="text-sm font-semibold text-foreground">前置知识</h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {course.prerequisites}
            </p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">课程目录</h2>

          {grouped.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">该课程暂未发布课节。</p>
          ) : (
            <div className="mt-4 space-y-6">
              {grouped.map((group, groupIndex) => (
                <div key={group.day?.id ?? `orphan-${groupIndex}`}>
                  <h3 className="text-sm font-semibold text-foreground">
                    {group.day ? `第 ${group.day.dayNumber} 天 · ${group.day.title}` : '其他课节'}
                  </h3>

                  <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
                    {group.lessons.map(lesson => {
                      const isExternal = lesson.type === 'external' && Boolean(lesson.externalUrl);
                      const inner = (
                        <>
                          <LessonIcon type={lesson.type} />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{lesson.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {LESSON_TYPE_LABELS[lesson.type] ?? lesson.type}
                          </span>
                          {lesson.duration && (
                            <span className="shrink-0 text-xs text-muted-foreground">{lesson.duration}</span>
                          )}
                          {lesson.isPaid && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-brand-accent">
                              <Lock className="h-3.5 w-3.5" />
                              第三方付费
                            </span>
                          )}
                        </>
                      );

                      const rowClass =
                        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated';

                      return (
                        <li key={lesson.id}>
                          {isExternal ? (
                            <a
                              href={lesson.externalUrl ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={rowClass}
                            >
                              {inner}
                            </a>
                          ) : (
                            <Link to={`/learn/${course.id}/${lesson.id}`} className={rowClass}>
                              {inner}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-10 text-xs text-muted-foreground">最近更新：{formatDateTime(course.updateTime)}</p>
      </div>
    </>
  );
}
