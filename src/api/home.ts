import http from '@/lib/http';
import type { Announcement, HomeSlots } from '@/types/content';

/**
 * 首页数据。
 *
 * 公告与推荐位是两个独立接口，合并成一次请求会把「公告没配」和「推荐位没配」
 * 两种情况耦合在一起，任一侧出错都会让整块首页留白。
 */
export const homeApi = {
  /** 指定位置的生效公告。不传 `position` 时后端按默认位置返回。 */
  announcements(position?: string): Promise<{ total: number; items: Announcement[] }> {
    return http.get<{ total: number; items: Announcement[] }>('/v1/home/announcements', {
      params: position ? { position } : undefined,
    });
  },

  /**
   * 推荐位。`keys` 用逗号拼接，例如 `home_featured_news,home_popular_course`。
   * 返回值里只有配了内容的槽位键，缺键即代表该槽位为空。
   */
  slots(keys: string[]): Promise<HomeSlots> {
    return http.get<HomeSlots>('/v1/home/slots', { params: { keys: keys.join(',') } });
  },
};
