import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, X, LogOut, User as UserIcon, LayoutDashboard, ChevronDown, Search, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { notificationApi } from '@/api/notification';
import { queryKeys } from '@/lib/queryKeys';
import { PRIMARY_NAV } from '@/routes/navigation';
import LoadingFallback from '@/components/common/LoadingFallback';
import { zh } from '@/locales/zh';
import { cn } from '@/lib/utils';

/**
 * 顶栏未读消息角标。
 *
 * 单独抽出来是因为它在桌面端与移动端各出现一次，且带自己的轮询节奏：
 * 60 秒一次、窗口重新聚焦时刷新。消息不是实时性要求高的内容，没必要用
 * WebSocket 或多打几倍请求；用户切回标签页时对一下，已经足够「及时」。
 *
 * 未登录时不发请求 —— `useQuery` 的 `enabled` 卡在 `isAuthenticated` 上，
 * 否则每个匿名访客首屏都要吃一个必然 401 的请求，并触发一次无谓的登出事件。
 */
function UnreadBadge() {
  const { status } = useAuth();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationApi.unreadCount(),
    enabled: status === 'authenticated',
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const count = data?.unread ?? 0;

  return (
    // 页头是深蓝实底，ghost 变体默认的深色前景在这里等于隐形，须显式转白；
    // hover 与导航项统一走「白色微透底 + 青字」。
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="text-white hover:bg-white/10 hover:text-cyan-300"
    >
      <Link to="/notifications" aria-label={count > 0 ? `${zh.nav.notifications}（${count} 条未读）` : zh.nav.notifications}>
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-medium leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
      </Link>
    </Button>
  );
}

/** 页头底色。官网 portal 页头的实值（`#1D45A8`），拆成 RGB 三元组以便调透明度。 */
const HEADER_BLUE_RGB = '29, 69, 168';

/**
 * 桌面端主导航项。
 *
 * 选中态沿官网做法：字色转青（`cyan-300`）+ 一条从中段向两侧渐隐的青色下划线。
 * 这里刻意**不复用**全站的 `--accent` 灰底药丸 —— 那是浅色底上的交互态，
 * 落在深蓝页头上是一块脏灰。未选中项 hover 同样只提亮文字并浮出下划线，
 * 不做底色块。青色取自 Tailwind 原生调色板（与 portal 页头同一组实值）。
 *
 * 用 `children` 函数式写法而非 `className` 函数：下划线选中态与 hover 态是
 * **两个不同元素**（选中是常亮渐变，hover 是从中间展开的实色线），只拿到
 * `isActive` 布尔值的 `className` 表达不了。
 */
function DesktopNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      // 首页用 `end`：否则 `/` 会前缀匹配到每一条路由，恒亮
      end={to === '/'}
      // 字号与内边距取官网页头实值（`text-lg` = 18px / `px-4 py-2`），
      // 比正文大一档是页头的常见做法，也让下划线有足够的宽度撑开
      className="group relative flex items-center rounded-lg px-4 py-2 text-lg"
    >
      {({ isActive }) => (
        <span
          className={cn(
            'relative transition-colors duration-200',
            isActive ? 'font-medium text-cyan-300' : 'text-white/90 group-hover:text-white',
          )}
        >
          {label}
          {isActive ? (
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-1 left-0 right-0 block h-0.5 rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-cyan-400/0"
            />
          ) : (
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-1 left-0 right-0 block h-0.5 origin-center scale-x-0 rounded-full bg-cyan-400/60 opacity-0 transition duration-300 group-hover:scale-x-100 group-hover:opacity-100"
            />
          )}
        </span>
      )}
    </NavLink>
  );
}

/**
 * 品牌标识。
 *
 * 图来自后台「系统设置 → 站点配置 → 品牌信息 → Logo 地址」，经 `SiteConfigContext`
 * 下发（`site_brand.logoUrl`）。**没有配置就什么都不渲染** —— 不回落本地图：
 * 站点要换自己的 Logo，留一个旧图兜底只会让人以为配置没生效。
 *
 * 高度锁定、宽度自适应（`h-10 md:h-12` + `w-auto`），因此不依赖图片的真实尺寸，
 * 运营填任意长宽比的图都不会被拉变形，也不能撑破页头。`object-contain` 兜住
 * 万一 w-auto 算出的宽度溢出。上限 `max-w-[200px]` 防止超宽图把导航挤走。
 *
 * 加载失败时按「没配置」处理（`onError` 收起）：运营填错链接是常见操作，
 * 页头上留一个碎图图标不如不显示。
 *
 * 注意 `key={logoUrl}`：换图时强制重建 `<img>`，否则上一次的 error 状态会
 * 一直卡住新图（React 不会因为 src 变了就清掉 DOM 上的失败态）。
 */
function BrandLogo() {
  const { brand } = useSiteConfig();
  const [failed, setFailed] = useState(false);

  // 后端把配置当稀疏表存，空串是「没设置」的正常取值，不是错误
  const logoUrl = brand.logoUrl?.trim();
  if (!logoUrl || failed) {
    return null;
  }

  return (
    <img
      key={logoUrl}
      src={logoUrl}
      alt={brand.name ?? zh.site.name}
      onError={() => setFailed(true)}
      className="h-10 w-auto max-w-[200px] object-contain transition-transform duration-300 group-hover:scale-105 md:h-12"
    />
  );
}

/**
 * 社区主站页头。视觉沿用官网 portal：深蓝实底（`#1D45A8`，透明度 0.9）+ 白色文字，
 * 青色作为选中与 hover 的强调色；滚动超过 30px 后补上毛玻璃与投影，并浮出一条
 * 底部渐隐青光线。
 *
 * 采用 `fixed` 而非 `sticky`（与 portal 一致），因此页面内容需自行让出 64px/72px
 * 的高度 —— 让位统一由 `CommunityLayout` 的内容容器承担，页面自身不必再各写一份。
 */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { status, user, isAdmin, logout } = useAuth();

  const { brand } = useSiteConfig();
  // 品牌名走后台配置，带本地兜底 —— 配置里 name 是必填，但接口失败时不能让页头空着
  const siteName = brand.name ?? zh.site.name;

  const navItems = PRIMARY_NAV;

  // 滚动过 30px 才加毛玻璃：首屏保持通透，滚动后页头才「浮」起来。
  // 监听器走 passive，避免在移动端阻断滚动手势。
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  const initials = user?.displayName?.slice(0, 1) ?? '';

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-500',
        scrolled && 'border-b border-cyan-400/10 shadow-[0_4px_30px_rgba(0,0,0,0.3)] backdrop-blur-[24px]',
      )}
      // 深蓝页头 + 0.9 透明度：官方站头部的实值。用 RGB 三元组而非 `bg-[#1D45A8]`
      // 是为了同时拿到「半透明底色 + 白色文字」这两件事，且不依赖 Tailwind 调色板。
      style={{ background: `rgba(${HEADER_BLUE_RGB}, 0.9)` }}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:h-[72px] md:px-6">
        <Link
          to="/"
          // `group` 是给 Logo 的 `group-hover:scale-105` 用的，别删
          className="group flex shrink-0 items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <BrandLogo />
          {/* 站点全名**始终可见**：Logo 现在按配置决定有无，窄屏下若再收起文字，
              没配 Logo 的站点会只剩一个空的点击区。 */}
          <span className="text-lg font-semibold tracking-tight text-white">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map(item => (
            <DesktopNavItem key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-white hover:bg-white/10 hover:text-cyan-300"
          >
            <Link to="/search" aria-label={zh.nav.search}>
              <Search className="h-4 w-4" />
            </Link>
          </Button>

          {/* 开源仓库入口：外链。尺寸与搜索图标一致，但加一圈细描边 ——
              并排两个纯 ghost 图标会分不清哪个是站内、哪个是跳出去。
              不显示 Star 数：访客在站内看到的数字永远滞后，不如只留入口。 */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full border border-white/20 text-white hover:border-cyan-300/60 hover:bg-white/10 hover:text-cyan-300"
          >
            <a
              href={zh.site.repoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={zh.nav.github}
              title={zh.nav.github}
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>

          {status === 'authenticated' && user ? (
            <>
              <UnreadBadge />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* 页头是深蓝实底，ghost 变体默认的浅灰 hover 在深底上是一块脏灰，
                      故此处显式覆盖为「白色微透底 + 青字」，与导航项同一套交互语汇。 */}
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 px-2 text-white hover:bg-white/10 hover:text-cyan-300"
                  >
                    <Avatar className="h-7 w-7">
                      {user.avatar && <AvatarImage src={user.avatar} alt={user.displayName} />}
                      <AvatarFallback className="bg-white/15 text-xs text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[8rem] truncate text-sm">{user.displayName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => navigate('/me')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    {zh.nav.profile}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {zh.nav.admin}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {zh.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-white hover:bg-white/10 hover:text-cyan-300"
              >
                <Link to="/login">{zh.nav.login}</Link>
              </Button>
              {/* 默认 primary 填充（226 100% 64%）与页头底色（#1D45A8 ≈ 同色相）
                  几乎同色，按钮会糊进背景。深底上改白色实心，既保留 CTA 权重
                  又拉开对比。 */}
              <Button size="sm" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/register">{zh.nav.register}</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={mobileOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:text-cyan-300 lg:hidden"
          onClick={() => setMobileOpen(open => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 底部光线：只在滚动态出现，与青色导航语言呼应；用元素本身承载渐变而非
          伪元素，避免为它单开一条 CSS 规则。 */}
      <div
        aria-hidden
        className={cn(
          'h-px transition-opacity duration-500',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'linear-gradient(to right, transparent, rgba(34,211,238,0.4), transparent)',
        }}
      />

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            // 页头是 `fixed`，菜单过高时会直接顶出视口且无法滚动，故限高并允许内部滚动。
            // 减去的 4rem 是移动端页头高度（`h-16`）。
            className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-white/10 backdrop-blur-[24px] lg:hidden"
            style={{ backgroundColor: `rgba(${HEADER_BLUE_RGB}, 0.98)` }}
          >
            <nav className="mx-auto flex max-w-[1280px] flex-col px-4 py-3">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'border-b-2 px-4 py-2.5 text-[15px] transition-colors',
                      isActive
                        ? 'border-cyan-400 font-bold text-cyan-300'
                        : 'border-transparent text-white/80 hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mx-auto flex max-w-[1280px] flex-col gap-2 border-t border-white/10 px-4 py-3">
              {/* 搜索入口排在账号操作之前 —— 匿名访客也能用，不该锁在登录态分支里 */}
              <Button
                variant="outline"
                className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                asChild
                onClick={() => setMobileOpen(false)}
              >
                <Link to="/search">
                  <Search className="mr-2 h-4 w-4" />
                  {zh.nav.search}
                </Link>
              </Button>

              <Button
                variant="outline"
                className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                asChild
                onClick={() => setMobileOpen(false)}
              >
                <a href={zh.site.repoUrl} target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  {zh.nav.github}
                </a>
              </Button>

              {status === 'authenticated' && user ? (
                <>
                  <Button
                    variant="outline"
                    className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate('/me');
                    }}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    {zh.nav.profile}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                    asChild
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/notifications">
                      <Bell className="mr-2 h-4 w-4" />
                      {zh.nav.notifications}
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="justify-start border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/admin/dashboard');
                      }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {zh.nav.admin}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="justify-start text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {zh.nav.logout}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-cyan-300"
                    asChild
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/login">{zh.nav.login}</Link>
                  </Button>
                  {/* 同桌面端：深蓝底上 primary 填充会糊掉，改白色实心 */}
                  <Button asChild className="bg-white text-primary hover:bg-white/90" onClick={() => setMobileOpen(false)}>
                    <Link to="/register">{zh.nav.register}</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/** 前台页面外层：页头 + 内容 + 页脚 */
export function CommunityLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      {/* 页头是 `fixed`，脱离文档流，这里补一份等高内边距把内容顶下来。
          放在布局层而不是各页面里：单个页面漏写就会有一截内容被页头盖住。 */}
      <main className="flex-1 pt-16 md:pt-[72px]">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-surface-elevated">
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-base font-semibold text-foreground">{zh.site.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{zh.site.slogan}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">{zh.footer.links}</p>
            <Link
              to="/user-agreement"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {zh.auth.userAgreement}
            </Link>
            <Link
              to="/privacy-policy"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {zh.auth.privacyPolicy}
            </Link>
            <a
              href={zh.site.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {zh.footer.github}
            </a>
            <a
              href={zh.site.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {zh.site.portalName}
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {year} {zh.site.portalName} · {zh.footer.rights}
        </div>
      </div>
    </footer>
  );
}

export default CommunityLayout;
