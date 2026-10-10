import type { PaginationQuery } from '@/types/common';
import type { LegalDocumentType } from '@/types/auth';
import type { TagType } from '@/types/content';

/**
 * React Query 的 key 工厂。集中定义避免各处手写字符串数组导致缓存失效
 * （列表参数进 key，才能做到翻页/筛选各自独立缓存）。
 */
export const queryKeys = {
  me: ['user', 'me'] as const,
  publicProfile: (id: string) => ['user', 'public', id] as const,

  /**
   * 公开运营配置（品牌/页脚/新闻分类词表）。
   *
   * 单键、无参数：全站任意页面拿到的是同一份，没有分页或筛选维度，
   * 也就没有「各页各缓存一份」的必要。
   */
  siteConfig: ['site-config', 'public'] as const,

  legal: (type: LegalDocumentType) => ['legal', type] as const,

  /**
   * 首页公告与推荐位。两个接口分开取（见 `api/home.ts` 的说明），
   * key 也分开：任一侧失败只影响自己那一块，另一块照常渲染。
   */
  home: {
    announcements: (position?: string) => ['home', 'announcements', position ?? 'default'] as const,
    /** 槽位键排序后进 key，避免调用方换一下顺序就多出一份缓存 */
    slots: (keys: string[]) => ['home', 'slots', [...keys].sort()] as const,
  },

  news: {
    /**
     * 泛型而非 `PaginationQuery & Record<string, unknown>`：后者要求调用方传进来的
     * 具体查询类型（`NewsQuery` 等）自带索引签名，而接口是没有索引签名的。
     * 泛型约束只要求「是分页查询」，具体的筛选字段原样进 key，缓存粒度不受影响。
     */
    list: <T extends PaginationQuery>(query: T) => ['news', 'list', query] as const,
    detail: (id: string) => ['news', 'detail', id] as const,
  },

  resources: {
    list: <T extends PaginationQuery>(query: T) => ['resource', 'list', query] as const,
    detail: (id: string) => ['resource', 'detail', id] as const,
    versions: (id: string) => ['resource', 'versions', id] as const,
  },

  courses: {
    list: <T extends PaginationQuery>(query: T) => ['course', 'list', query] as const,
    detail: (id: string) => ['course', 'detail', id] as const,
  },

  /**
   * 评论。新闻评论与资源反馈共用同一组接口，因此 key 里必须带 `targetType`，
   * 否则同一 id 下的两类讨论会互相覆盖缓存。
   *
   * 前缀 `comments(targetType, targetId)` 故意不带页码：发评论后按前缀失效即可
   * 清掉该目标下的所有分页缓存，不必逐页 invalidate。
   */
  comments: {
    all: (targetType: string, targetId: string) => ['comments', targetType, targetId] as const,
    list: (targetType: string, targetId: string, page: number) =>
      ['comments', targetType, targetId, page] as const,
  },

  search: (keyword: string) => ['search', keyword] as const,

  /**
   * 个人中心下的三类列表。
   *
   * 收藏与关注都**分页**，所以页码进 key；消息列表另有未读数这个独立查询，
   * 用一个 `unreadCount` 单键即可 —— 未读数是标量，不需要按分页参数区分。
   *
   * 关注没有页码：后端 `take: 200` 硬编码且不分页，key 里放参数只会造出
   * 一个永远只有一个取值的多余维度。
   */
  favorites: {
    /**
     * `targetType` 必须进 key：它是筛选条件，漏掉的话切换「资讯/资源」标签
     * 会命中同一份缓存，用户看到的是上一个标签的列表。
     */
    list: (targetType: string, page: number) => ['favorites', 'list', targetType, page] as const,
  },
  follows: ['follows', 'mine'] as const,
  /** 我的下载：只按页码分页，没有筛选维度，页码进 key 即可 */
  downloads: (page: number) => ['downloads', 'mine', page] as const,
  notifications: {
    /** 根键。标记已读后按它整体失效，列表与角标一次清干净。 */
    all: ['notifications'] as const,
    /**
     * `unreadOnly` 是筛选条件，必须进 key —— 漏掉的话切到「未读」标签会复用
     * 「全部」那一份缓存，用户看到的还是全部消息。
     */
    list: (query: PaginationQuery & { unreadOnly?: boolean }) =>
      ['notifications', 'list', query] as const,
    unreadCount: ['notifications', 'unread'] as const,
    preferences: ['notifications', 'preferences'] as const,
  },

  /**
   * 后台。每个模块根键下留一个 `all`，写操作后按模块整体失效，
   * 避免为了精确匹配而把同一份查询参数在页面里重复拼一遍。
   */
  admin: {
    users: {
      all: ['admin', 'users'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'users', 'list', query] as const,
      detail: (id: string) => ['admin', 'users', 'detail', id] as const,
    },
    logs: {
      all: ['admin', 'logs'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'logs', 'list', query] as const,
    },
    metrics: {
      all: ['admin', 'metrics'] as const,
      overview: (days: number) => ['admin', 'metrics', 'overview', days] as const,
    },
    legal: {
      all: ['admin', 'legal'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'legal', 'list', query] as const,
    },
    configs: {
      all: ['admin', 'configs'] as const,
      list: () => ['admin', 'configs', 'list'] as const,
    },
    news: {
      all: ['admin', 'news'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'news', 'list', query] as const,
      detail: (id: string) => ['admin', 'news', 'detail', id] as const,
    },
    /**
     * 标签按 `type` 分段：新闻标签与资源标签是**两套独立词表**（后端 Tag 表用
     * `type` 列区分），同一个 key 前缀下必须带上 type 才不会互相串缓存。
     */
    tags: {
      all: (type: TagType) => ['admin', 'tags', type] as const,
      list: (type: TagType, query: Record<string, unknown>) =>
        ['admin', 'tags', type, 'list', query] as const,
    },
    resources: {
      all: ['admin', 'resources'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'resources', 'list', query] as const,
      detail: (id: string) => ['admin', 'resources', 'detail', id] as const,
      versions: (id: string) => ['admin', 'resources', 'versions', id] as const,
    },
    courses: {
      all: ['admin', 'courses'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'courses', 'list', query] as const,
      detail: (id: string) => ['admin', 'courses', 'detail', id] as const,
    },
    announcements: {
      all: ['admin', 'announcements'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'announcements', 'list', query] as const,
    },
    slots: {
      all: ['admin', 'slots'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'slots', 'list', query] as const,
    },
    comments: {
      all: ['admin', 'comments'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'comments', 'list', query] as const,
      pendingCount: () => ['admin', 'comments', 'pending-count'] as const,
    },
    subscriptions: {
      all: ['admin', 'subscriptions'] as const,
      list: (query: Record<string, unknown>) => ['admin', 'subscriptions', 'list', query] as const,
      stats: () => ['admin', 'subscriptions', 'stats'] as const,
    },
  },
};
