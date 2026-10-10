import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { zh } from '@/locales/zh';
import { cn } from '@/lib/utils';

/** 注册页那组亮点。作为默认值，使调用方不传 `panelBullets` 时也有完整观感。 */
export const DEFAULT_PANEL_BULLETS: readonly string[] = zh.authPanel.register.bullets;

/**
 * 整屏背景图。取自 `public/bg.jpg`（原样复制到 dist 根，故用绝对路径）。
 *
 * 原图 1408×768（1.83:1），与 1920×1080（1.78:1）几乎同比，因此 `bg-cover`
 * 铺满整屏时只裁掉约 3%，基本等于原图呈现。**不要把它限制在左半边那种近方形的
 * 容器里** —— 那样会裁掉左右各约四分之一。
 */
const PAGE_BG_IMAGE = '/bg.jpg';

interface AuthSplitLayoutProps {
  /** 左侧面板主标题 */
  panelTitle: string;
  /** 左侧面板副文案 */
  panelSubtitle?: string;
  /** 亮点列表。传 `[]` 即为不渲染这一块。 */
  panelBullets?: readonly string[];
  /** 右侧表单区内容 */
  children: ReactNode;
}

/**
 * 背景遮罩。
 *
 * 两层叠加：
 * - 一层均匀压暗，保证整页与图片的观感统一；
 * - 一层从左到右由深转浅 —— 左栏是白字（品牌与亮点），需要足够暗才达到正文
 *   对比度；右侧是白底半透明表单卡，遮罩可以很浅，让图片本身透出来。
 *
 * 合起来左端约 0.86、右端约 0.53。
 */
function BackdropScrim() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(95deg, hsl(229 84% 12% / 0.75) 0%, hsl(229 84% 12% / 0.48) 42%, hsl(229 84% 12% / 0.15) 100%), hsl(229 84% 12% / 0.45)',
      }}
    />
  );
}

/** 左侧面板的亮点列表。空数组时不占版面。 */
function PanelBullets({ bullets }: { bullets: readonly string[] }) {
  if (bullets.length === 0) {
    return null;
  }

  return (
    <ul className="mt-8 space-y-3.5">
      {bullets.map(bullet => (
        <li key={bullet} className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          <span className="hero-surface-muted text-sm leading-relaxed">{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 认证页外壳：整屏背景图 + 左品牌文案 / 右表单。
 *
 * 背景图铺满整个视口，而不是只铺左半边 —— 它用 `fixed inset-0` 而非
 * `absolute inset-0`：注册表单比视口高，页面会滚动，`absolute` 会跟着内容一起
 * 被拉长，于是 `bg-cover` 改成以「内容框」为基准，图片被额外放大、裁得更多。
 * `fixed` 始终以视口为基准，滚到哪都正好铺满一屏。
 *
 * **`md:h` + `md:overflow-hidden` 是去掉页面纵向滚动条的关键。** 认证页没有页头
 * 页脚，根容器此前只有 `min-h`，于是注册表单（7 个字段约 840px）在矮窗口下会把
 * 文档撑高、出现页面级滚动条。改成 `md:` 起固定为视口高度并裁掉溢出后，页面本身
 * 永不滚动；表单区若真的放不下，由右栏内部滚动承接（见下方 `overflow-y-auto`），
 * 背景不动，观感是「内容在玻璃后面滚」。
 *
 * 右栏内容用 `m-auto` 居中而不是 `items-center`：`items-center` 在内容高于容器时
 * 会把顶部截掉且滚不到，`margin: auto` 在放得下时居中、放不下时从上排起并正常滚动。
 *
 * 根容器的 `isolate` 不可省：背景层与遮罩用负 z-index 排在内容之下，若根容器
 * 没有独立的层叠上下文，它们会落到根上下文、被根容器自身的背景色盖住而看不见。
 *
 * 本组件只负责外壳。表单本身（`AuthCard` 及其中的 schema、字段、提交）
 * 完全不动，改版不会触及认证逻辑。
 */
export function AuthSplitLayout({
  panelTitle,
  panelSubtitle,
  panelBullets = DEFAULT_PANEL_BULLETS,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        // 认证页**没有页头页脚**（路由挂在 `CommunityLayout` 之外），所以这里用
        // 整屏高度 `screen`，**不能**再减去页头的 72px —— 减掉那 72px 等于白白
        // 丢掉一条竖向空间，正是它把注册表单（8 行字段）挤进溢出、逼出滚动条。
        'relative isolate flex min-h-screen flex-col',
        // md 起锁定为视口高度并裁掉溢出 —— 页面不再出现纵向滚动条
        'md:h-screen md:min-h-0 md:flex-row md:overflow-hidden',
        // 兜底底色：图片加载失败时若没有它，就是白底上的白字。
        'bg-[hsl(229,84%,12%)]',
      )}
    >
      {/* 整屏背景图。`fixed` 以视口为基准，`cover` 居中裁切。 */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${PAGE_BG_IMAGE})` }}
      />
      <div className="fixed inset-0 -z-10">
        <BackdropScrim />
      </div>

      {/* 宽屏左栏：品牌与亮点。不参与滚动，始终完整可见。
          宽度 40%（`xl` 起 44%），给右侧表单留更宽的版面。 */}
      <div className="hidden md:flex md:w-[40%] md:shrink-0 md:flex-col md:justify-between md:p-10 xl:w-[44%] xl:p-14">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-white">{zh.site.name}</p>
          <p className="hero-surface-muted mt-2 text-sm">{zh.site.slogan}</p>
        </div>

        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            {panelTitle}
          </h2>
          {panelSubtitle && (
            <p className="hero-surface-muted mt-4 text-base leading-relaxed">{panelSubtitle}</p>
          )}
          <PanelBullets bullets={panelBullets} />
        </div>

        <p className="hero-surface-muted text-xs">{zh.site.portalName}</p>
      </div>

      {/* 右栏：窄屏品牌块 + 表单。表单区是唯一的滚动承接者。 */}
      <div className="flex flex-1 flex-col md:min-h-0">
        <div className="px-6 pt-10 md:hidden">
          <p className="text-lg font-semibold tracking-tight text-white">{zh.site.name}</p>
          <p className="hero-surface-muted mt-1.5 text-xs leading-relaxed">
            {panelSubtitle ?? zh.site.slogan}
          </p>
        </div>

        {/* `overflow-y-auto` 只在表单真的放不下时才产生滚动条；`m-auto` 负责居中。
            `lg:pr-16 xl:pr-24` 让表单靠近右边缘，而不是悬在栏目正中。 */}
        <div className="flex flex-1 overflow-y-auto px-4 py-8 md:min-h-0 md:px-8 md:py-10 lg:pr-16 xl:pr-24">
          {/* 460px：按用户要求收窄（曾一度是 440，后来加宽到 520）。
              `lg:ml-auto lg:mr-0` 把它推到右边缘，而不是悬在栏目正中。 */}
          <div className="m-auto w-full max-w-[460px] lg:ml-auto lg:mr-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AuthSplitLayout;
