import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Cpu, FlaskConical, Gauge, LayoutGrid, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResourceCategory } from '@/types/content';

interface DirectionEntry {
  title: string;
  description: string;
  /**
   * 关联的资源分类。有值时节卡片指向 `/resources?category=<值>` —— 这是资源
   * 列表页真实读取的查询参数，因此静态板块也能导向真实内容而不是死链。
   * 无对应分类的方向为 `null`，卡片渲染成不可点的说明项。
   */
  resourceCategory: ResourceCategory | null;
}

/**
 * 六个技术方向。`resourceCategory` 与后端资源分类枚举
 * （`isa-extension` / `compiler-toolchain` / `model-operator-library` /
 * `simulation-platform` / `technical-docs`）对齐，使「方向」与「资源」两类信息能
 * 对上号；「开发板与固件」在新词表里没有对应的资源分类，因此为 `null`。
 *
 * 不导出：本文件是纯组件文件，导出常量会让 Fast Refresh 失效
 * （`react-refresh/only-export-components`）。测试直接断言渲染结果。
 */
const DIRECTION_ENTRIES: readonly DirectionEntry[] = [
  {
    title: '指令集扩展',
    description: 'RISC-V 基础指令集、向量扩展与面向 AI 负载的自定义扩展设计。',
    resourceCategory: 'isa-extension',
  },
  {
    title: 'AI 编译器与工具链',
    description: '面向 RISC-V 的编译、图优化、算子融合与代码生成。',
    resourceCategory: 'compiler-toolchain',
  },
  {
    title: '模型与算子库',
    description: '常见模型的移植适配，以及高性能算子库的实现与调优。',
    resourceCategory: 'model-operator-library',
  },
  {
    title: '仿真平台',
    description: '包含 Qemu 模拟器、Gem5 模拟器等',
    resourceCategory: 'simulation-platform',
  },
  {
    title: '开发板与固件',
    description: '开发板支持包、启动固件、驱动与端侧部署示例。',
    resourceCategory: null,
  },
  {
    title: '技术文档',
    description: '包括技术规范、设计和开发文档等',
    resourceCategory: 'technical-docs',
  },
];

const ICONS = [LayoutGrid, Wrench, Boxes, Cpu, FlaskConical, Gauge] as const;

/**
 * RISC-V 主题与方向矩阵。
 *
 * 纯静态板块：主题说明是产品定位文案，方向卡片把既有资源分类重新组织成
 * 「技术方向」这个视角。有对应资源分类的方向链到真实的筛选结果，没有的渲染成
 * 不可点卡片 —— 给一个点进去是空列表的链接比不可点更糟。
 *
 * 本区块不含任何数字或统计口径的表述，避免被误读为运营数据。
 */
export function TopicAndDirections() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 md:py-16">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          围绕 TileLang for RISC-V 的开放生态
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          RISC-V 以开放指令集为起点，正在从嵌入式走向高性能计算与 AI 加速。社区围绕
          「指令集扩展 — AI编译器与工具链 — 模型与算子库 — 仿真平台」这条链路组织内容，把可复用的
          工具链、算子库、仿真测试等方法沉淀下来，降低从学习到落地的门槛。
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          以下六个方向对应社区持续投入的技术领域。带链接的方向可以直达相关资源的筛选结果。
        </p>
      </div>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTION_ENTRIES.map((entry, index) => {
          const Icon = ICONS[index % ICONS.length];
          const cardClass =
            'group flex h-full flex-col rounded-[1.25rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all duration-300';

          const inner = (
            <>
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-base font-medium text-foreground transition-colors group-hover:text-primary">
                {entry.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
              {entry.resourceCategory && (
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                  查看相关资源
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </>
          );

          if (!entry.resourceCategory) {
            return (
              <div key={entry.title} className={cardClass}>
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={entry.title}
              to={`/resources?category=${entry.resourceCategory}`}
              className={cn(cardClass, 'hover:border-primary/30 hover:shadow-[var(--shadow-elevated)]')}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default TopicAndDirections;
