import { zh } from '@/locales/zh';

/**
 * 前台主导航。
 *
 * 只登记**已实现**的路由：导航项与路由表同源，避免出现「菜单点进去是 404」。
 * 新模块落地时在 `routes.tsx` 加路由、在这里加一行即可。
 */
export interface NavLink {
  to: string;
  label: string;
}

/**
 * 顺序即展示顺序：先内容、再资源与课程，最后是介绍性的关于页 ——
 * 「关于社区」是二次信息，压在最后比夹在中间更符合阅读习惯。
 */
export const PRIMARY_NAV: NavLink[] = [
  { to: '/', label: zh.nav.home },
  { to: '/news', label: zh.nav.news },
  { to: '/resources', label: zh.nav.resources },
  { to: '/courses', label: zh.nav.courses },
  { to: '/about', label: zh.nav.about },
];

/** 页脚「相关链接」栏 */
export const FOOTER_LINKS: NavLink[] = [
  { to: '/about', label: zh.nav.about },
  { to: '/guidelines', label: zh.nav.guidelines },
  { to: '/contact', label: zh.nav.contact },
];
