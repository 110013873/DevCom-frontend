import type { ReactNode } from 'react';
import { Card, Empty, Typography } from 'antd';

const { Text } = Typography;

interface ChartCardProps {
  title: string;
  /** 标题右侧的补充说明，例如口径或单位 */
  extra?: ReactNode;
  /** 图表区高度（px）。大屏要的是稳定高度，而不是 shadcn 那套 aspect-video 比例 */
  height?: number;
  /** 为 true 时用 `Empty` 占位，避免空数据画出无意义的坐标轴 */
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}

/**
 * 图表卡片外壳。
 *
 * 统一处理「标题栏 + 固定高度绘图区 + 空状态」三件事：让每个图表组件只关心
 * recharts 的绘制，不必各自重复布局与空数据判断。
 */
export default function ChartCard({
  title,
  extra,
  height = 280,
  isEmpty = false,
  emptyText = '暂无数据',
  children,
}: ChartCardProps) {
  return (
    <Card
      title={title}
      extra={extra ? <Text type="secondary" className="text-xs">{extra}</Text> : undefined}
      styles={{ body: { padding: 16 } }}
      className="h-full"
    >
      {isEmpty ? (
        <div style={{ height }} className="flex items-center justify-center">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        </div>
      ) : (
        <div style={{ height }} className="w-full">
          {children}
        </div>
      )}
    </Card>
  );
}
