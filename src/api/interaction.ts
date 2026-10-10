import http from '@/lib/http';
import type { Page } from '@/types/common';
import type { FavoriteResult, FollowResult, MyFavoriteItem, MyFollowItem, ReactionResult } from '@/types/content';

/**
 * 互动接口：点赞、收藏、关注。
 *
 * 三个动作都是**幂等**的 —— 后端用唯一约束兜底，重复 POST 不会报错也不会
 * 产生第二条记录。因此前端不必先查再写，直接用返回值（布尔）作为新状态即可。
 */
export const interactionApi = {
  like(targetType: string, targetId: string): Promise<ReactionResult> {
    return http.post<ReactionResult>('/v1/reactions', { targetType, targetId });
  },

  unlike(targetType: string, targetId: string): Promise<ReactionResult> {
    return http.delete<ReactionResult>('/v1/reactions', { data: { targetType, targetId } });
  },

  favorite(targetType: string, targetId: string): Promise<FavoriteResult> {
    return http.post<FavoriteResult>('/v1/favorites', { targetType, targetId });
  },

  unfavorite(targetType: string, targetId: string): Promise<FavoriteResult> {
    return http.delete<FavoriteResult>('/v1/favorites', { data: { targetType, targetId } });
  },

  /**
   * 我的收藏。被收藏对象下线后，标题等展示字段为 null —— 不是错误，
   * 页面按「内容已下线」渲染。
   */
  myFavorites(params: { targetType?: string; pageNumber?: number; pageSize?: number } = {}): Promise<Page<MyFavoriteItem>> {
    return http.get<Page<MyFavoriteItem>>('/v1/favorites/mine', { params });
  },

  follow(targetType: string, targetId: string): Promise<FollowResult> {
    return http.post<FollowResult>('/v1/follows', { targetType, targetId });
  },

  unfollow(targetType: string, targetId: string): Promise<FollowResult> {
    return http.delete<FollowResult>('/v1/follows', { data: { targetType, targetId } });
  },

  /** 我的关注。与其他 `mine` 接口不同，这里返回裸数组，不分页。 */
  myFollows(): Promise<MyFollowItem[]> {
    return http.get<MyFollowItem[]>('/v1/follows/mine');
  },
};
