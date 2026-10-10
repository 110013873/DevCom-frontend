import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, ExternalLink, List } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import { Markdown } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { courseApi } from '@/api/course';
import { queryKeys } from '@/lib/queryKeys';
import { LESSON_TYPE_LABELS, type LessonSummary } from '@/types/content';
import { cn } from '@/lib/utils';

/**
 * 已完成课节的本地记录键。
 *
 * 后端的**学习进度接口属于 C 阶段**（培养与贡献），第一期没有 `LessonProgress`
 * 端点可用。因此「标记完成」只写浏览器 localStorage，不假装已同步到服务端 ——
 * 换设备或清缓存就会丢，这一点在按钮旁的提示里如实说明。
 *
 * 待 C 阶段的 `/v1/users/me/progress` 落地后，这里换成读写接口即可，
 * 页面其余部分不受影响。
 */
const DONE_STORAGE_KEY = 'devcom:lesson-done';

function readDoneSet(courseId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${DONE_STORAGE_KEY}:${courseId}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    // 存储被禁用或内容损坏时退化为「没有已完成的课节」，不影响阅读。
    return new Set();
  }
}

function writeDoneSet(courseId: string, done: Set<string>): void {
  try {
    window.localStorage.setItem(`${DONE_STORAGE_KEY}:${courseId}`, JSON.stringify([...done]));
  } catch {
    // 隐私模式下写入会失败；完成状态丢失可接受，不打扰用户。
  }
}

/**
 * 学习页。
 *
 * 目录顺序取**扁平课节列表**按 `sortOrder` 排序后的结果 —— Day 分组只是展示
 * 层，上一节/下一节要跨天连续，所以不能按 Day 分组走。
 *
 * `external` 类型的课节正文为空，页面改为展示一个跳转按钮。
 */
export default function LessonPlayer() {
  const { courseId = '', lessonId = '' } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => courseApi.detail(courseId),
    enabled: Boolean(courseId),
  });

  const lessonQuery = useQuery({
    queryKey: [...queryKeys.courses.detail(courseId), 'lesson', lessonId],
    queryFn: () => courseApi.lesson(courseId, lessonId),
    enabled: Boolean(courseId && lessonId),
  });

  const [done, setDone] = useState<Set<string>>(() => readDoneSet(courseId));
  const [tocOpen, setTocOpen] = useState(false);

  // 切课程时重新读一次本地记录，避免显示上一门课的完成状态。
  useEffect(() => {
    setDone(readDoneSet(courseId));
  }, [courseId]);

  /** 跨天的连续课节顺序，供上一节/下一节使用。 */
  const ordered = useMemo<(LessonSummary & { dayNumber: number | null })[]>(() => {
    if (!detailQuery.data) {
      return [];
    }
    const { days, lessons } = detailQuery.data;
    const dayOf = new Map<string, number>();
    days.forEach(day => day.lessons.forEach(lesson => dayOf.set(lesson.id, day.dayNumber)));
    return [...lessons]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map(lesson => ({ ...lesson, dayNumber: dayOf.get(lesson.id) ?? null }));
  }, [detailQuery.data]);

  const currentIndex = ordered.findIndex(lesson => lesson.id === lessonId);
  const prev = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;

  const toggleDone = () => {
    const updated = new Set(done);
    if (updated.has(lessonId)) {
      updated.delete(lessonId);
    } else {
      updated.add(lessonId);
    }
    setDone(updated);
    writeDoneSet(courseId, updated);
  };

  const goTo = (id: string) => {
    setTocOpen(false);
    navigate(`/learn/${courseId}/${id}`);
  };

  if (detailQuery.isLoading || lessonQuery.isLoading) {
    return <LoadingBlock label="正在加载课节..." />;
  }

  if (detailQuery.isError || lessonQuery.isError || !lessonQuery.data) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-4 py-16 md:px-6">
        <ErrorState
          title="课节不存在或已下线"
          message="该课节可能已被删除，或者尚未发布。"
          onRetry={() => void lessonQuery.refetch()}
        />
        <div className="mt-6 text-center">
          <Link
            to={`/courses/${courseId}`}
            className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
          >
            返回课程详情
          </Link>
        </div>
      </div>
    );
  }

  const lesson = lessonQuery.data;
  const isDone = done.has(lesson.id);
  const isExternal = lesson.type === 'external' && Boolean(lesson.externalUrl);

  const toc = ordered.length > 0 && (
    <nav aria-label="课程目录" className="divide-y divide-border overflow-hidden rounded-[1.25rem] border border-border bg-card">
      {ordered.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => goTo(item.id)}
          className={cn(
            'flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-surface-elevated',
            item.id === lessonId && 'bg-primary/5',
          )}
        >
          {done.has(item.id) ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          )}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              item.id === lessonId ? 'font-medium text-primary' : 'text-foreground',
            )}
          >
            {item.dayNumber !== null ? `Day${item.dayNumber} · ` : ''}
            {item.title}
          </span>
        </button>
      ))}
    </nav>
  );

  return (
    <>
      <SEOHead title={`${lesson.title} · ${lesson.courseTitle}`} description={`${lesson.courseTitle} 的课节：${lesson.title}`} />

      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6 md:py-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {lesson.courseTitle}
          </Link>

          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setTocOpen(open => !open)}>
            <List className="mr-1.5 h-4 w-4" />
            目录
          </Button>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{LESSON_TYPE_LABELS[lesson.type] ?? lesson.type}</Badge>
              {lesson.isPaid && <Badge variant="outline">第三方付费</Badge>}
              {lesson.duration && <span className="text-xs text-muted-foreground">{lesson.duration}</span>}
            </div>

            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground">{lesson.title}</h1>

            {isExternal ? (
              <div className="mt-8 rounded-[1.25rem] border border-border bg-surface-elevated p-6">
                <p className="text-sm text-muted-foreground">本节内容托管在第三方站点，点击前往查看。</p>
                <Button className="mt-4" asChild>
                  <a href={lesson.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    前往学习
                  </a>
                </Button>
              </div>
            ) : lesson.content ? (
              <div className="mt-8">
                <Markdown content={lesson.content} />
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted-foreground">本节暂无正文内容。</p>
            )}

            {!isExternal && (
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                <Button variant={isDone ? 'secondary' : 'outline'} size="sm" onClick={toggleDone} aria-pressed={isDone}>
                  {isDone ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <Circle className="mr-1.5 h-4 w-4" />}
                  {isDone ? '已完成' : '标记完成'}
                </Button>
                <span className="text-xs text-muted-foreground">完成状态保存在本机浏览器，换设备不会同步。</span>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4">
              {prev ? (
                <Button variant="outline" size="sm" onClick={() => goTo(prev.id)}>
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  上一节
                </Button>
              ) : (
                <span />
              )}
              {next ? (
                <Button variant="outline" size="sm" onClick={() => goTo(next.id)}>
                  下一节
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <span />
              )}
            </div>
          </main>

          {toc && (
            <aside className={cn('lg:sticky lg:top-24 lg:block lg:self-start', tocOpen ? 'block' : 'hidden')}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">课程目录</h2>
              {toc}
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
