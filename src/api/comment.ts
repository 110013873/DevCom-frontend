import http from '@/lib/http';
import type { Page } from '@/types/common';
import type { Comment, CreateCommentPayload } from '@/types/content';

/**
 * 评论与反馈统一接口。
 *
 * 后端把新闻评论与资源反馈放在同一张表、同一组路由下，用 `targetType` 区分。
 * 返回值只嵌套一层：某条评论的 `replies` 里不会再出现 `replies`。
 */
export const commentApi = {
  /**
   * 评论列表。后端返回 `Page<Comment>`，分页参数与其他列表接口一致。
   *
   * 顶层只包含「根评论」，其回复挂在各自的 `replies` 里 —— 因此 `total` 是
   * 根评论数，不是含回复的总条数。
   */
  list(
    targetType: string,
    targetId: string,
    params: { pageNumber?: number; pageSize?: number } = {},
  ): Promise<Page<Comment>> {
    return http.get<Page<Comment>>('/v1/comments', { params: { targetType, targetId, ...params } });
  },

  /**
   * 发表评论。后端限流 60 秒 10 条。
   *
   * 需要登录 —— 未登录时 `@Authorized()` 会直接返回 401，页面应在此之前
   * 就引导用户登录，而不是等请求失败。
   */
  create(payload: CreateCommentPayload): Promise<Comment> {
    return http.post<Comment>('/v1/comments', payload);
  },

  /** 删除。仅评论作者本人或版主可删。 */
  remove(id: string): Promise<{ deleted: true }> {
    return http.delete<{ deleted: true }>(`/v1/comments/${id}`);
  },
};
