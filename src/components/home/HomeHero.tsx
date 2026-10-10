import { Link } from 'react-router-dom';
import { Boxes, GraduationCap, MessagesSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NebulaBackground } from '@/components/background/NebulaBackground';
import { ParticleField } from '@/components/background/ParticleField';
import { useAuth } from '@/contexts/AuthContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { zh } from '@/locales/zh';

/**
 * 芯片 + 指令流示意。纯矢量，不依赖任何图片素材 —— 换成位图会引入加载失败、
 * 版权与构建期图片处理三重依赖，而这里要的只是「一眼看出是 RISC-V 生态」这层意象。
 */
function ChipMotif() {
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden="true"
      className="h-full w-full max-w-[380px] drop-shadow-[0_0_40px_rgba(34,211,238,0.25)]"
    >
      <rect x="70" y="70" width="180" height="180" rx="20" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <rect x="110" y="110" width="100" height="100" rx="12" stroke="#22d3ee" strokeWidth="2" />
      <text
        x="160"
        y="168"
        textAnchor="middle"
        fill="#22d3ee"
        fontSize="26"
        fontWeight="600"
        fontFamily="JetBrains Mono, monospace"
      >
        RV
      </text>

      {/* 引脚：四边各 4 条 */}
      <g stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
        {[0, 1, 2, 3].map(i => (
          <g key={i}>
            <line x1={115 + i * 30} y1="40" x2={115 + i * 30} y2="70" />
            <line x1={115 + i * 30} y1="250" x2={115 + i * 30} y2="280" />
            <line x1="40" y1={115 + i * 30} x2="70" y2={115 + i * 30} />
            <line x1="250" y1={115 + i * 30} x2="280" y2={115 + i * 30} />
          </g>
        ))}
      </g>

      {/* 指令流：右侧三条渐隐横线 */}
      <g stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <line x1="286" y1="140" x2="312" y2="140" />
        <line x1="286" y1="160" x2="306" y2="160" />
        <line x1="286" y1="180" x2="312" y2="180" />
      </g>
    </svg>
  );
}

/**
 * 首页首屏。
 *
 * 视觉由三层叠出：`.hero-surface` 的深蓝渐变底 → `NebulaBackground` 的漂移光晕
 * → `ParticleField` 的 canvas 粒子。后两者是仓库里既有的组件，此前没有任何页面
 * 引用；这里复用而非重写。
 *
 * 两者默认是 `fixed inset-0`（整页背景），直接放在首屏里会盖住下方所有内容。
 * 因此共用一个 `absolute inset-0 overflow-hidden [&>*]:!absolute` 的定位父级包住，
 * 用它把子元素自身的 `fixed` 覆盖掉 —— 这样它们只作用于首屏区域。
 *
 * 粒子在前庭敏感用户那里是真实困扰，因此由 `usePrefersReducedMotion` 决定是否
 * 挂载：canvas 动画不受 CSS `@media` 中 `animation: none` 的影响，只能在 JS 层决定。
 *
 * 三个入口里「参与社区」按登录态分流 —— 已登录时再推注册没有意义。
 * `status === 'loading'` 期间按匿名处理，避免首屏闪一下又换成个人中心。
 */
export function HomeHero() {
  const { status } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isAuthenticated = status === 'authenticated';

  return (
    <section className="hero-surface relative isolate overflow-hidden">
      {/* 背景层：绝对定位覆盖组件自身的 fixed，因此只作用于首屏区域。
          `isolate`（上面 section 上的）不可省：两个背景组件自带 `-z-10` / `-z-20`，
          没有独立层叠上下文时它们会落到根上下文里、被本节 `.hero-surface` 的
          背景盖住而完全看不见。isolate 把负 z-index 圈在本节内部。

          `!bg-transparent` 同样不可省：`NebulaBackground` 自带
          `style={{ background: '#ffffff' }}`（它原本是整页白底背景），
          不覆盖掉会把首屏的深蓝渐变整块刷白。 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden [&>*]:!absolute [&>*]:!bg-transparent"
      >
        <NebulaBackground />
        {!prefersReducedMotion && <ParticleField />}
      </div>

      <div className="relative mx-auto grid max-w-[1280px] gap-12 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {zh.site.portalName}
          </p>

          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
            {zh.site.name}
          </h1>

          <p className="hero-surface-muted mt-5 text-base leading-relaxed md:text-lg">{zh.site.slogan}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/courses">
                <GraduationCap className="mr-1.5 h-4 w-4" aria-hidden="true" />
                开始学习
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link to="/resources">
                <Boxes className="mr-1.5 h-4 w-4" aria-hidden="true" />
                探索资源
              </Link>
            </Button>

            <Button
              size="lg"
              variant="ghost"
              asChild
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <Link to={isAuthenticated ? '/me' : '/register'}>
                <MessagesSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {isAuthenticated ? '进入个人中心' : '参与社区'}
              </Link>
            </Button>
          </div>
        </div>

        {/* 右侧主视觉。窄屏收起 —— 小屏上它只会把三个按钮挤出首屏。 */}
        <div className="hidden justify-center lg:flex">
          <ChipMotif />
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
