import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard';
import { axisProps, gridColor, paletteColor, tooltipStyle, formatInteger } from '@/lib/chartTheme';
import type { MetricTrendPoint } from '@/types/admin';

/** 可切换的数据序列。默认只开「下载」——它是社区最直接的活跃信号。 */
const SERIES = [
  { key: 'downloads', label: '下载' },
  { key: 'users', label: '新增用户' },
  { key: 'comments', label: '评论' },
  { key: 'news', label: '新闻' },
  { key: 'resources', label: '资源' },
  { key: 'subscriptions', label: '订阅' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

interface TrendChartProps {
  data: MetricTrendPoint[];
  /** 只画这些序列；默认全画 */
  series?: SeriesKey[];
  height?: number;
  title?: string;
}

/**
 * 运营趋势折线（面积）图。
 *
 * 用面积而非纯折线：社区日数据量级小、波动大，纯折线在零值密集的日期区间看着
 * 像断续的虚线；填充后能看清「有/无活动」的整体轮廓。
 */
export default function TrendChart({ data, series, height = 300, title = '运营趋势' }: TrendChartProps) {
  const active = series ? SERIES.filter(item => series.includes(item.key)) : SERIES;

  return (
    <ChartCard title={title} extra={`近 ${data.length} 天`} height={height} isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            {active.map((item, index) => {
              const color = paletteColor(index);
              return (
                <linearGradient key={item.key} id={`trend-fill-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor()} vertical={false} />
          <XAxis
            dataKey="date"
            {...axisProps()}
            // 30 天全标会糊成一片，抽样显示
            interval="preserveStartEnd"
            minTickGap={24}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis {...axisProps()} allowDecimals={false} width={44} />
          <Tooltip contentStyle={tooltipStyle()} formatter={(value: number) => formatInteger(value)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {active.map((item, index) => {
            const color = paletteColor(index);
            return (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={color}
                strokeWidth={2}
                fill={`url(#trend-fill-${item.key})`}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
