import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/** 侧栏的技术主题词条。纯展示，不链接 —— 对应的专题页尚未实现。 */
const TOPICS = [
  'RISC-V 指令集与 AI 扩展',
  'AI 编译器与算子优化',
  '芯片设计与 IP 核',
  '工具链与仿真验证',
  '开发板与固件',
  '基准测试与性能评估',
];

/** 侧栏的社区入口。全部指向已实现的路由。 */
const ENTRIES = [
  { to: '/resources', label: '资源中心', hint: '工具链 / 算子库 / 固件' },
  { to: '/courses', label: '学习中心', hint: '按路径系统入门' },
  { to: '/guidelines', label: '社区公约', hint: '参与讨论前请先阅读' },
] as const;

/**
 * 最新动态的右侧栏。
 *
 * 两部分都是静态内容：主题词条是产品说明（对应专题页尚未实现，因此做成不可点的
 * 标签而不是假链接），社区入口指向已实现路由。
 *
 * 窄屏下整块移到列表下方（由 `LatestNews` 的网格决定），此处不自带响应式隐藏。
 */
export function HomeSidebar() {
  return (
    <aside className="space-y-5">
      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-foreground">技术主题</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {TOPICS.map(topic => (
            <span
              key={topic}
              className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-muted-foreground"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-semibold text-foreground">快速入口</h3>
        <ul className="mt-3 space-y-1">
          {ENTRIES.map(entry => (
            <li key={entry.to}>
              <Link
                to={entry.to}
                className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{entry.hint}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default HomeSidebar;
