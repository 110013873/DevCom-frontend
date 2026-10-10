import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from './ChartCard';
import { paletteColor, tooltipStyle, formatInteger } from '@/lib/chartTheme';
import type { MetricSlice } from '@/types/admin';

interface DistributionChartProps {
  title: string;
  data: MetricSlice[];
  /** 把原始取值翻译成展示名；缺失则回退到原值 */
  labelOf: (key: string) => string;
  height?: number;
  extra?: string;
}

/**
 * 分布饼图（环形）。
 *
 * 用环形而非实心饼：中心留白放总数，比在图例里再找一遍更直观。扇区标签一律
 * 放图例、不贴在图内 —— 中文标签较长，贴图会在窄卡片里互相压字。
 */
export default function DistributionChart({ title, data, labelOf, height = 280, extra }: DistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const chartData = data.map((item, index) => ({
    name: labelOf(item.key),
    value: item.count,
    color: paletteColor(index),
  }));

  return (
    <ChartCard title={title} extra={extra ?? `共 ${formatInteger(total)}`} height={height} isEmpty={total === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="48%"
            innerRadius="52%"
            outerRadius="76%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map(item => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle()} formatter={(value: number) => formatInteger(value)} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => <span style={{ color: 'inherit' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
