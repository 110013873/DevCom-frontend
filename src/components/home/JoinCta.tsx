import { Link } from 'react-router-dom';
import { Building2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { zh } from '@/locales/zh';

/** 三个合作方向。均为产品说明，不涉及任何统计或承诺性数字。 */
const COOPERATION = [
  {
    icon: Building2,
    title: '生态伙伴',
    description: '面向芯片、工具链与终端厂商，共建 TileLang for RISC-V 的软硬件适配与联合方案。',
  },
  {
    icon: Users,
    title: '开发者与讲师',
    description: '欢迎贡献资源、编写课程与分享实践，让沉淀下来的经验被更多人复用。',
  },
  {
    icon: Mail,
    title: '高校与科研机构',
    description: '联合开展课程建设、课题研究与人才培养，打通教学与产业需求。',
  },
] as const;

/**
 * 生态合作与收尾 CTA。
 *
 * 深色底收束页面 —— 首页以深色首屏开场、以深色结尾，中间是浅色内容，
 * 视觉上有一个闭合。同时这也是全页最后一个转化点，因此主按钮的权重最高。
 */
export function JoinCta() {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return (
    <section className="hero-surface relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-[1280px] px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">共建开放协同的生态</h2>
          <p className="hero-surface-muted mt-4 text-base leading-relaxed">
            社区以开放协作的方式推进 TileLang for RISC-V 的技术落地。无论你是开发者、讲师，还是企业与科研机构，
            都可以在这里找到参与的方式。
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {COOPERATION.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[1.25rem] border border-white/15 bg-white/5 p-6 backdrop-blur-sm"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-base font-medium text-white">{title}</p>
              <p className="hero-surface-muted mt-2 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {isAuthenticated ? (
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/me">进入个人中心</Link>
            </Button>
          ) : (
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <Link to="/register">立即注册</Link>
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white"
          >
            <Link to="/about">关于社区</Link>
          </Button>

          <Button size="lg" variant="ghost" asChild className="text-white hover:bg-white/15 hover:text-white">
            <Link to="/contact">联系方式</Link>
          </Button>
        </div>

        <p className="hero-surface-muted mt-8 text-xs">{zh.site.portalName}</p>
      </div>
    </section>
  );
}

export default JoinCta;
