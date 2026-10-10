import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { PageHeader } from '@/components/common/PageStates';
import LoadingFallback from '@/components/common/LoadingFallback';
import { cn } from '@/lib/utils';

/**
 * 个人中心外壳。
 *
 * 页头与标签栏放在这里，子页面**只渲染自己的内容区** —— 各子页面共用同一
 * 个标题和导航，各写一遍必然会漂移。
 *
 * `/me` 这个标签必须带 `end`：不带的话它会匹配所有 `/me/*` 子路径，
 * 所有标签会同时高亮。
 */
const TABS = [
  { to: '/me', label: '基本资料', end: true },
  { to: '/me/favorites', label: '我的收藏', end: false },
  { to: '/me/downloads', label: '我的下载', end: false },
  { to: '/me/follows', label: '我的关注', end: false },
  { to: '/me/notifications', label: '消息设置', end: false },
  { to: '/me/password', label: '账号安全', end: false },
];

export default function MeLayout() {
  return (
    <>
      <SEOHead title="个人中心" description="管理你的社区资料、收藏、关注与账号安全设置。" />

      <PageHeader title="个人中心" description="管理公开资料、内容收藏与账号安全" />

      <div className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-[1280px] px-4 md:px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="个人中心导航">
            {TABS.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* 子页面同样懒加载，切换标签时只替换内容区 */}
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}
