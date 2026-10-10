import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { paletteColor } from '@/lib/chartTheme';

const { Text } = Typography;

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** 副信息，例如「较上期 +12」或口径说明 */
  hint?: string;
  /** 取色板索引；同一分区内保持同一色，便于扫读 */
  tone?: number;
  icon?: ReactNode;
}

/**
 * 大屏 KPI 数字块。
 *
 * 刻意**不用 AntD 的 `Statistic`**：那个组件自带一套字号/颜色规则，在大屏网格里
 * 与图表卡片的密度对不上。这里只保留「标签 + 大数字 + 副注」三层，尺寸由调用方
 * 的栅格决定。
 */
export default function StatTile({ label, value, hint, tone = 0, icon }: StatTileProps) {
  const accent = paletteColor(tone);

  return (
    <Card styles={{ body: { padding: '16px 18px' } }} className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Text type="secondary" className="text-xs">
            {label}
          </Text>
          <div
            className="mt-1 truncate text-2xl font-semibold leading-tight tabular-nums"
            style={{ color: accent }}
            title={typeof value === 'string' ? value : undefined}
          >
            {value}
          </div>
          {hint ? (
            <Text type="secondary" className="mt-1 block truncate text-xs" title={hint}>
              {hint}
            </Text>
          ) : null}
        </div>
        {icon ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
            style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
