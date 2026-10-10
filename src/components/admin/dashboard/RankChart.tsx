import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from './ChartCard';
import { axisProps, gridColor, paletteColor, tooltipStyle, formatInteger } from '@/lib/chartTheme';

export interface RankItem {
  /** 条目标题（新闻标题 / 资源名 / 标签名） */
  label: string;
  value: number;
  /** 行末补充说明，如分类或发布时间 */
  meta?: string;
}

interface RankChartProps {
  title: string;
  data: RankItem[];
  height?: number;
  extra?: string;
  emptyText?: string;
}

/** 长标题截断：横向柱状图的 Y 轴标签放不下太长中文 */
function truncate(text: string, max = 16): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * 排行榜横向柱状图。
 *
 * 数据已在后端按值降序，这里**按原序**渲染：recharts 的 `YAxis` 自下而上排布，
 * 用 `reversed` 让「第一名」落在顶部，符合阅读习惯。
 */
export default function RankChart({ title, data, height = 300, extra, emptyText = '暂无数据' }: RankChartProps) {
  const chartData = data.map(item => ({
    name: truncate(item.label),
    完整名称: item.label,
    value: item.value,
    meta: item.meta,
  }));
  const maxValue = Math.max(...data.map(item => item.value), 1);

  return (
    <ChartCard title={title} extra={extra} height={height} isEmpty={data.length === 0} emptyText={emptyText}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, maxValue]} />
          <YAxis
            type="category"
            dataKey="name"
            {...axisProps()}
            width={112}
            reversed
            interval={0}
          />
          <Tooltip
            contentStyle={tooltipStyle()}
            formatter={(value: number, _name, entry) => [
              formatInteger(value),
              (entry?.payload as { meta?: string } | undefined)?.meta ?? '数量',
            ]}
            labelFormatter={(_label, payload) => (payload?.[0]?.payload as { 完整名称?: string } | undefined)?.['完整名称'] ?? ''}
            cursor={{ fill: gridColor(), fillOpacity: 0.4 }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {chartData.map((_item, index) => (
              <Cell key={index} fill={paletteColor(index)} />
            ))}
            <LabelList dataKey="value" position="right" formatter={(value: number) => formatInteger(value)} style={{ fontSize: 12, fill: 'hsl(220 10% 46%)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
