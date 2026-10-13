import type { Page, PaginationQuery } from './common';

/**
 * 内容域类型（新闻 / 资源 / 课程 / 标签 / 评论 / 互动 / 消息 / 搜索 / 首页）。
 *
 * 全部按后端控制器的**实际返回体**书写，而不是照抄实体类：后端在列表接口里
 * 普遍做了字段裁剪（不出 storageKey、不出未审内容），详情与列表的字段集也
 * 并不相同。因此这里对「列表项」「详情」「版本」分别建模，不复用一个宽类型
 * 加上一堆可选字段 —— 那样会把「后端没返回」和「后端返回了空值」混为一谈。
 */

// ---------------------------------------------------------------------------
// 通用
// ---------------------------------------------------------------------------

/** 后端分页响应的别名，仅用于可读性 */
export type Paged<T> = Page<T>;

/** 各内容域的排序字段白名单，与后端 `SORTABLE_FIELDS` 对齐 */
export const NEWS_SORTS = ['publishedAt', 'viewCount', 'createTime'] as const;
export const RESOURCE_SORTS = ['downloadCount', 'ratingAvg', 'createTime', 'name'] as const;

/**
 * 排序字段类型从白名单数组派生，而不是手写联合类型 —— 加一个字段只改数组，
 * 类型自动跟上，不会出现「白名单里有、类型里没有」的漂移。
 */
export type NewsSort = (typeof NEWS_SORTS)[number];
export type ResourceSort = (typeof RESOURCE_SORTS)[number];

// ---------------------------------------------------------------------------
// 标签
// ---------------------------------------------------------------------------

export type TagType = 'news' | 'resource';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  usageCount: number;
  createTime: string;
  updateTime: string;
}

/** 标签列表与热标签接口共用的查询参数 */
export interface TagQuery extends PaginationQuery {
  /** 热标签接口的条数上限，后端限制在 1–100 */
  limit?: number;
}

// ---------------------------------------------------------------------------
// 新闻
// ---------------------------------------------------------------------------

export interface NewsListItem {
  id: string;
  title: string;
  subtitle: string | null;
  summary: string;
  coverImage: string | null;
  category: string;
  author: string | null;
  publishedAt: string;
  viewCount: number;
  isFeatured: boolean;
  likeCount: number;
  commentCount: number;
  /** 当前登录用户是否已点赞；未登录恒为 false */
  liked: boolean;
  favorited: boolean;
  tags: Tag[];
}

export interface NewsDetail extends NewsListItem {
  /** 正文 HTML，由后端富文本编辑器产出；渲染前仍需 DOMPurify 过滤 */
  contentHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  updateTime: string;
}

/**
 * 相关阅读。
 *
 * 后端该接口只 `select` 了六个字段，**不是**完整的 `NewsListItem` —— 因此
 * 不能复用列表项类型，否则渲染时会在运行时读到 undefined。
 */
export interface NewsRelatedItem {
  id: string;
  title: string;
  summary: string;
  coverImage: string | null;
  publishedAt: string;
  viewCount: number;
}

export interface NewsQuery extends PaginationQuery {
  category?: string;
  tag?: string;
  /** 传 `'true'` 时只返回置顶新闻 */
  featured?: string;
}

// ---------------------------------------------------------------------------
// 资源
// ---------------------------------------------------------------------------

export type ResourceCategory =
  | 'isa-extension'
  | 'compiler-toolchain'
  | 'model-operator-library'
  | 'simulation-platform'
  | 'technical-docs';

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  'isa-extension': '指令集扩展',
  'compiler-toolchain': 'AI 编译器与工具链',
  'model-operator-library': '模型与算子库',
  'simulation-platform': '仿真平台',
  'technical-docs': '技术文档',
};

export interface ResourceListItem {
  id: string;
  name: string;
  summary: string;
  coverImage: string | null;
  category: string;
  author: string | null;
  isRecommended: boolean;
  isFree: boolean;
  supportedArch: string | null;
  downloadCount: number;
  /** 后端已把 Postgres numeric 转成 number，这里直接当数字用 */
  ratingAvg: number;
  ratingCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  tags: Tag[];
}

export interface ResourceFile {
  id: string;
  version: string;
  versionId: string;
  fileName: string;
  osArch: string | null;
  /** 字节数。后端 `bigint` 列在读出口统一转成 number */
  size: number;
  checksum: string | null;
  /** OSS 直链。私有资源不保证可直接访问，正式下载请走 download 接口 */
  url: string;
  updateTime: string;
}

export interface ResourceVersion {
  id: string;
  version: string;
  name: string | null;
  description: string | null;
  changelog: string | null;
  isDefault: boolean;
  giteeUrl: string | null;
  githubUrl: string | null;
  createTime: string;
  files: ResourceFile[];
}

export interface ResourceDetail {
  id: string;
  name: string;
  summary: string;
  overview: string;
  coverImage: string | null;
  category: string;
  author: string | null;
  isFree: boolean;
  supportedArch: string | null;
  /** Markdown 文本，需经 MarkdownRenderer 渲染 */
  keyFeatures: string | null;
  quickStart: string | null;
  systemRequirements: string | null;
  downloadCount: number;
  ratingAvg: number;
  ratingCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  tags: Tag[];
  versions: ResourceVersion[];
  /** 当前登录用户对该资源的评分（1–5）；未评分或未登录为 null */
  myScore: number | null;
  updateTime: string;
}

/** 下载凭据。前端拿到 `url` 后直接触发浏览器下载。 */
export interface DownloadTicket {
  resourceId: string;
  resourceName: string;
  versionId: string;
  version: string;
  fileId: string;
  fileName: string;
  osArch: string | null;
  size: number;
  checksum: string | null;
  url: string;
}

export interface ResourceRatingResult {
  /** 本次提交的分数 */
  score: number;
  /** 更新后的均值与人数，可直接回写详情缓存 */
  ratingAvg: number;
  ratingCount: number;
}

/** 资源反馈：与新闻评论共用一张表，但前台入口只有正文与点赞数 */
export interface ResourceFeedback {
  id: string;
  content: string;
  likeCount: number;
  createTime: string;
  userId: string | null;
}

export interface ResourceQuery extends PaginationQuery {
  category?: string;
  tag?: string;
  /** 传 `'true'` 时只看推荐资源 */
  recommended?: string;
  /** 传 `'true'` 时只看免费资源 */
  free?: string;
}

export const RATING_MIN = 1;
export const RATING_MAX = 5;

// ---------------------------------------------------------------------------
// 课程
// ---------------------------------------------------------------------------

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonType = 'markdown' | 'video' | 'doc' | 'external';

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  markdown: '图文',
  video: '视频',
  doc: '文档',
  external: '外部链接',
};

export interface CourseListItem {
  id: string;
  title: string;
  coverImage: string | null;
  level: CourseLevel;
  direction: string | null;
  instructor: string | null;
  /** 自由文本，例如「10 天 · 约 20 学时」 */
  duration: string | null;
  description: string;
}

/**
 * 课程详情里嵌在 Day 下的课节。
 *
 * **不含 `content`** —— 后端详情接口刻意裁掉了正文，避免一次拉回整门课的
 * Markdown。正文要走 `courseApi.lesson(courseId, lessonId)` 单取。
 */
export interface LessonSummary {
  id: string;
  dayId: string | null;
  title: string;
  type: LessonType;
  externalUrl: string | null;
  /** 仅表示「需第三方付费」，平台本身不代收费用 */
  isPaid: boolean;
  duration: string | null;
  sortOrder: number;
}

export interface CourseDay {
  id: string;
  courseId: string;
  dayNumber: number;
  title: string;
  sortOrder: number;
  lessons: LessonSummary[];
}

/** 单个课节全文，学习页使用 */
export interface LessonDetail extends LessonSummary {
  courseId: string;
  courseTitle: string;
  content: string;
}

export interface CourseDetail {
  id: string;
  title: string;
  coverImage: string | null;
  level: CourseLevel;
  direction: string | null;
  instructor: string | null;
  duration: string | null;
  prerequisites: string | null;
  description: string;
  updateTime: string;
  days: CourseDay[];
  /** 扁平课节列表（含未归入任何 Day 的课节），用于目录兜底 */
  lessons: LessonSummary[];
  lessonCount: number;
}

export interface CourseQuery extends PaginationQuery {
  level?: CourseLevel | '';
  direction?: string;
}

// ---------------------------------------------------------------------------
// 评论（新闻评论与资源反馈共用）
// ---------------------------------------------------------------------------

export type CommentStatus = 'pending' | 'published' | 'hidden';

export interface CommentAuthor {
  id: string;
  displayName: string;
  avatar: string | null;
}

export interface Comment {
  id: string;
  content: string;
  status: CommentStatus;
  likeCount: number;
  createTime: string;
  /** 作者已注销时为 null */
  author: CommentAuthor | null;
  /** 只嵌套一层：回复的回复会被拍平到这里，不再递归 */
  replies: Comment[];
}

export interface CreateCommentPayload {
  targetType: string;
  targetId: string;
  content: string;
  parentId?: string;
}

// ---------------------------------------------------------------------------
// 互动（点赞 / 收藏 / 关注）
// ---------------------------------------------------------------------------

export interface ReactionResult {
  liked: boolean;
}

export interface FavoriteResult {
  favorited: boolean;
}

export interface FollowResult {
  followed: boolean;
}

/**
 * 我的收藏。
 *
 * 标题等展示字段在被收藏对象已下线时为 null —— 后端不替前端编占位文案，
 * 页面对 null 显示「内容已下线」。
 */
export interface MyFavoriteItem {
  id: string;
  targetType: string;
  targetId: string;
  createTime: string;
  title: string | null;
  summary: string | null;
  coverImage: string | null;
}

/** 我的关注。关注对象可以是用户、话题或标签，`label` 由后端解析后给出。 */
export interface MyFollowItem {
  id: string;
  targetType: string;
  targetId: string;
  createTime: string;
  label: string | null;
}

/**
 * 我的下载。
 *
 * 与收藏刻意不同：目标资源已下线/转隐藏时，后端**整条过滤掉**，因此这里的
 * `title` 等字段虽在类型上可空，实际不会出现「有记录、无标题」的条目。
 * 保留可空是因为后端确实可能给出 null（版本/文件可能缺），页面对 null 兜底。
 *
 * 后端**不返回** `fileId`/`storageKey`/`url` —— 那等于给出一条绕过下载鉴权
 * 的通路。要再下载一次，走资源详情页的正常入口。
 */
export interface MyDownloadItem {
  /** 下载记录 id，仅作列表 key：同一资源多次下载会有多条 */
  id: string;
  targetId: string;
  createTime: string;
  title: string | null;
  summary: string | null;
  coverImage: string | null;
  category: string | null;
  versionName: string | null;
  fileName: string | null;
  osArch: string | null;
  size: number | null;
}

// ---------------------------------------------------------------------------
// 消息中心
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  /** 消息跳转目标的类型与 id，点击时拼成前台路径 */
  linkType: string | null;
  linkId: string | null;
  /** 未读时为 null */
  readAt: string | null;
  createTime: string;
}

export interface NotificationListResult {
  total: number;
  /** 未读总数，与 `items` 的筛选条件无关 */
  unread: number;
  items: NotificationItem[];
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  /**
   * 类别开关。**不是数组** —— 后端这一列是自由的 `jsonb`（`Record<string, unknown>`），
   * 写入的 DTO 用 `@IsObject()` 校验，传数组会被判为类型错误。
   *
   * 未出现过的键视为「开启」：后端只在用户主动改动后才写入这一列，
   * 空对象代表「全部默认开启」，而不是「全部关闭」。
   */
  categories: Record<string, boolean>;
}

/** 消息分类的展示文案。后端只存 key，文案在前端维护。 */
export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  system: '系统通知',
  news: '新闻动态',
  comment: '评论回复',
  resource: '资源更新',
  course: '课程通知',
  subscription: '订阅推送',
};

// ---------------------------------------------------------------------------
// 全站搜索
// ---------------------------------------------------------------------------

/** 搜索分组键。注意资源组是单数 `resource`，与路由前缀 `/v1/resources` 不同。 */
export type SearchGroupKey = 'news' | 'resource' | 'course';

export interface SearchHit {
  id: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  group: SearchGroupKey;
  /** 后端已拼好的前台路径，前端直接用作链接目标 */
  url: string;
}

export interface SearchGroup {
  total: number;
  items: SearchHit[];
}

export interface SearchResult {
  keyword: string;
  /** 三组命中数之和 */
  total: number;
  groups: Record<SearchGroupKey, SearchGroup>;
}

// ---------------------------------------------------------------------------
// 首页
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  content: string;
  position: string;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createTime: string;
  updateTime: string;
}

/**
 * 推荐位条目：三类内容共用一组字段，用 `type` 判别。
 *
 * `summary` 可为 null：课程的摘要取自 `Course.description`，后端在首屏聚合里
 * 写的是 `course.description || null`（见 [[homeController]] 的 `resolve`），
 * 空描述就是 null 而不是空串。新闻/资源那两侧是 `NOT NULL DEFAULT ''` 的列，
 * 实际不会为 null，但类型按三类里最宽的那个统一声明 —— 让渲染方自己对
 * 「摘要可能没有」做兜底，好过在类型上撒谎。
 */
interface SlotItemBase {
  id: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  /** 后端拼好的前台路径 */
  url: string;
}

export interface NewsSlotItem extends SlotItemBase {
  type: 'news';
  publishedAt: string;
}

export interface ResourceSlotItem extends SlotItemBase {
  type: 'resource';
  category: string;
  downloadCount: number;
  ratingAvg: number;
}

export interface CourseSlotItem extends SlotItemBase {
  type: 'course';
  level: CourseLevel;
  instructor: string | null;
  duration: string | null;
}

export type SlotItem = NewsSlotItem | ResourceSlotItem | CourseSlotItem;

/** `GET /v1/home/slots` 的返回：`slotKey → 条目数组` */
export interface HomeSlots {
  slots: Record<string, SlotItem[]>;
}

/**
 * 首页推荐位使用的槽位键。
 *
 * 与后端 `RecommendationSlot.slotKey` 的取值约定一致；运营在后台配置时
 * 必须使用这些键，否则前台取不到数据。
 */
export const HOME_SLOT_KEYS = {
  featuredNews: 'home_featured_news',
  recommendedResources: 'home_recommended_resource',
  popularCourses: 'home_popular_course',
} as const;

// ---------------------------------------------------------------------------
// 订阅（公开接口，用邮件里的令牌作为凭据）
// ---------------------------------------------------------------------------

export type SubscriptionStatus = 'pending' | 'active' | 'unsubscribed' | 'suppressed';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending: '待确认',
  active: '已订阅',
  unsubscribed: '已退订',
  suppressed: '已抑制',
};

export interface SubscribeResult {
  sent: true;
  email: string;
}

export interface SubscriptionPreferencesResult {
  email: string;
  status: SubscriptionStatus;
  preferences: Record<string, unknown>;
}
