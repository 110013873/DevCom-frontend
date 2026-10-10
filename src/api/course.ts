import http from '@/lib/http';
import type { Page } from '@/types/common';
import type { CourseDetail, CourseListItem, CourseQuery, LessonDetail, LessonSummary } from '@/types/content';

/**
 * 课程接口。
 *
 * 课程详情里的课节是**目录项**（无正文），正文要单独取 —— 一门课几十节课，
 * 详情页只需要渲染标题列表，正文按需加载。
 */
export const courseApi = {
  list(query: CourseQuery = {}): Promise<Page<CourseListItem>> {
    return http.get<Page<CourseListItem>>('/v1/courses', { params: query });
  },

  detail(id: string): Promise<CourseDetail> {
    return http.get<CourseDetail>(`/v1/courses/${id}`);
  },

  /** 单个课节全文，学习页使用 */
  lesson(courseId: string, lessonId: string): Promise<LessonDetail> {
    return http.get<LessonDetail>(`/v1/courses/${courseId}/lessons/${lessonId}`);
  },

  /**
   * 该课程全部课节的完整行（含正文）。
   *
   * 一次性拉回整门课的正文，只适合「上一节 / 下一节」需要在客户端就地的场景；
   * 普通浏览请用 `lesson()`。
   */
  lessons(courseId: string): Promise<Page<LessonSummary & { content: string }>> {
    return http.get<Page<LessonSummary & { content: string }>>(`/v1/courses/${courseId}/lessons`);
  },
};
