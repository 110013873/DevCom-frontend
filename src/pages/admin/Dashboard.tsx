import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import {
  CommentOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { ErrorState, LoadingBlock } from '@/components/common/PageStates';
import StatTile from '@/components/admin/dashboard/StatTile';
import TrendChart from '@/components/admin/dashboard/TrendChart';
import DistributionChart from '@/components/admin/dashboard/DistributionChart';
import RankChart from '@/components/admin/dashboard/RankChart';
import { adminMetricApi } from '@/api/admin';
import { queryKeys } from '@/lib/queryKeys';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { formatCount, resourceCategoryLabel } from '@/lib/contentLabels';
import { formatDateTime } from '@/lib/datetime';
import { formatInteger } from '@/lib/chartTheme';
import { COURSE_LEVEL_LABELS } from '@/types/content';
import {
  NEWS_STATUS_LABELS,
  RESOURCE_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/types/adminContent';
import { zh } from '@/locales/zh';
import type { AuditStatus } from '@/types/admin';
import type { AdminOverview, MetricSlice } from '@/types/admin';

const { Title, Text } = Typography;

/** 时间窗口。大屏默认看近 30 天。 */
const RANGE_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

/**
 * 后端返回**原始枚举值**，展示名在这里翻译。后端只存值不存词，词表变动不会
 * 让统计接口失真；代价是新增枚举值时要同步这里 —— 翻译不到时会原样显示取值，
 * 不会静默变成空白。
 */
const USER_STATUS_LABELS: Record<string, string> = {
  active: '正常',
  banned: '已封禁',
};

/** 与 `entity/comment.ts` 的 `CommentStatus` 对应 */
const COMMENT_STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  published: '已发布',
  hidden: '已隐藏',
};

/** 与 `pages/admin/Logs.tsx` 的 `STATUS_META` 取值一致（那边管筛选，这里管读） */
const AUDIT_STATUS_META: Record<AuditStatus, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  warning: { label: '警告', color: 'orange' },
  danger: { label: '危险', color: 'red' },
};

/** 命中词表就翻译，否则原样返回（未知取值不该在统计页上凭空消失） */
function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

/**
 * 运营概览（大屏）。
 *
 * 全站运营数据的**只读**聚合视图。所有数字来自 `GET /v1/admin/metrics/overview`
 * 的真实查询，没有数据就是 0，不放示例值。
 *
 * 这里不再展示当前登录账号 —— `AdminLayout` 的页头已经有头像与昵称，大屏的
 * 版面留给数据本身。
 */
export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { newsCategoryLabel } = useSiteConfig();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.admin.metrics.overview(days),
    queryFn: () => adminMetricApi.overview(days),
    // 切换时间窗口时保留上一份数据，避免整屏图表闪成骨架
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <SEOHead title="运营概览" description={`${zh.site.name} 管理后台运营数据大屏`} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            运营概览
          </Title>
          <Text type="secondary">{zh.site.name} 管理后台 · 全站运营数据</Text>
        </div>
        <Space>
          {isFetching && !isLoading ? (
            <Text type="secondary" className="text-xs">
              正在刷新…
            </Text>
          ) : null}
          <Segmented options={RANGE_OPTIONS} value={days} onChange={value => setDays(value as number)} />
        </Space>
      </div>

      {isLoading ? (
        <Card>
          <LoadingBlock label="正在加载运营数据…" />
        </Card>
      ) : isError || !data ? (
        <Card>
          <ErrorState
            title="运营数据加载失败"
            message={error instanceof Error ? error.message : '请稍后重试'}
            onRetry={() => void refetch()}
          />
        </Card>
      ) : (
        <DashboardBody data={data} newsCategoryLabel={newsCategoryLabel} />
      )}
    </div>
  );
}

interface DashboardBodyProps {
  data: AdminOverview;
  newsCategoryLabel: (category: string | null | undefined) => string;
}

/** 数据就绪后的正文。抽出来只为让主组件只做「取数 + 分支」两件事。 */
function DashboardBody({ data, newsCategoryLabel }: DashboardBodyProps) {
  const { totals, trends, distributions, rankings } = data;
  const days = data.range.days;

  return (
    <div className="space-y-6">
      {/* ── 关键指标 ───────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="注册用户"
            value={formatInteger(totals.user.total)}
            hint={`近 ${days} 天新增 ${formatInteger(totals.user.new)}`}
            tone={0}
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="活跃用户"
            value={formatInteger(totals.user.activeInRange)}
            hint={
              totals.user.total > 0
                ? `占全站 ${Math.round((totals.user.activeInRange / totals.user.total) * 100)}%`
                : '近 ' + days + ' 天有登录'
            }
            tone={1}
            icon={<UserAddOutlined />}
          />
        </Col>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="资源总数"
            value={formatInteger(totals.resource.total)}
            hint={`已发布 ${formatInteger(totals.resource.published)} · 隐藏 ${formatInteger(totals.resource.hidden)}`}
            tone={2}
            icon={<DatabaseOutlined />}
          />
        </Col>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="累计下载"
            value={formatInteger(totals.download.total)}
            hint={`近 ${days} 天 ${formatInteger(totals.download.inRange)}`}
            tone={3}
            icon={<DownloadOutlined />}
          />
        </Col>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="新闻阅读"
            value={formatCount(totals.news.views)}
            hint={`已发布 ${formatInteger(totals.news.published)} 篇`}
            tone={4}
            icon={<FileTextOutlined />}
          />
        </Col>
        <Col xs={12} lg={8} xl={4}>
          <StatTile
            label="评论总数"
            value={formatInteger(totals.comment.total)}
            hint={totals.comment.pending > 0 ? `待审核 ${formatInteger(totals.comment.pending)} 条` : '无待审核'}
            tone={5}
            icon={<CommentOutlined />}
          />
        </Col>
      </Row>

      {/* ── 趋势 ───────────────────────────────────────────── */}
      <TrendChart data={trends} height={320} title={`运营趋势（近 ${days} 天）`} />

      {/* ── 分布 ───────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="新闻分类分布"
            data={distributions.newsCategory}
            labelOf={newsCategoryLabel}
          />
        </Col>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="资源分类分布"
            data={distributions.resourceCategory}
            labelOf={resourceCategoryLabel}
          />
        </Col>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="下载来源分类"
            data={distributions.downloadCategory}
            labelOf={resourceCategoryLabel}
          />
        </Col>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="评论状态"
            data={distributions.commentStatus}
            labelOf={key => labelOf(COMMENT_STATUS_LABELS, key)}
          />
        </Col>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="订阅状态"
            data={distributions.subscriptionStatus}
            labelOf={key => labelOf(SUBSCRIPTION_STATUS_LABELS, key)}
          />
        </Col>
        <Col xs={24} lg={12} xl={8}>
          <DistributionChart
            title="课程难度分布"
            data={distributions.courseLevel}
            labelOf={key => labelOf(COURSE_LEVEL_LABELS, key)}
          />
        </Col>
      </Row>

      {/* ── 排行 ───────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <RankChart
            title="热门资源（按累计下载）"
            extra="Top 8"
            data={rankings.topResources.map(item => ({
              label: item.name,
              value: item.downloadCount,
              meta: resourceCategoryLabel(item.category),
            }))}
            emptyText="尚无已发布的资源"
          />
        </Col>
        <Col xs={24} xl={12}>
          <RankChart
            title="热门新闻（按阅读量）"
            extra="Top 8"
            data={rankings.topNews.map(item => ({
              label: item.title,
              value: item.viewCount,
              meta: newsCategoryLabel(item.category),
            }))}
            emptyText="尚无已发布的新闻"
          />
        </Col>
      </Row>

      {/* ── 状态一览 + 标签 ────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="内容状态一览" extra={<Text type="secondary" className="text-xs">未在上方饼图中展开的口径</Text>} styles={{ body: { padding: 0 } }}>
            <Table
              rowKey={row => `${row.group}-${row.label}`}
              size="small"
              pagination={false}
              dataSource={statusRows(distributions)}
              columns={[
                { title: '类别', dataIndex: 'group', width: 90 },
                { title: '状态', dataIndex: 'label', render: (value: string) => <Tag>{value}</Tag> },
                {
                  title: '数量',
                  dataIndex: 'count',
                  align: 'right',
                  width: 100,
                  render: (value: number) => formatInteger(value),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <RankChart
            title="热门标签"
            extra="Top 8"
            height={324}
            data={rankings.topTags.map(item => ({ label: item.name, value: item.count, meta: '关联内容' }))}
            emptyText="尚未使用标签"
          />
        </Col>
      </Row>

      {/* ── 最近操作 ───────────────────────────────────────── */}
      <Card title="最近操作" extra={<Text type="secondary" className="text-xs">最新的 10 条管理操作</Text>} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={data.recentAuditLogs}
          locale={{ emptyText: '暂无操作记录' }}
          scroll={{ x: 720 }}
          columns={[
            {
              title: '时间',
              dataIndex: 'createTime',
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            { title: '操作人', dataIndex: 'adminName', width: 140 },
            {
              title: '模块',
              dataIndex: 'module',
              width: 100,
              render: (value: string | null) => value ?? '—',
            },
            { title: '动作', dataIndex: 'action' },
            {
              title: '结果',
              dataIndex: 'status',
              width: 90,
              render: (value: AuditStatus) => (
                <Tag color={AUDIT_STATUS_META[value].color}>{AUDIT_STATUS_META[value].label}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

interface StatusRow {
  group: string;
  label: string;
  count: number;
}

/**
 * 「内容状态一览」的行。
 *
 * 只列**没有**出现在上方饼图中的三组状态分布（用户/新闻/资源），否则同一页面上
 * 同一份数据会出现两次，读者会先怀疑是两套口径。
 */
function statusRows(distributions: AdminOverview['distributions']): StatusRow[] {
  const groups: Array<{ group: string; slices: MetricSlice[]; labels: Record<string, string> }> = [
    { group: '用户', slices: distributions.userStatus, labels: USER_STATUS_LABELS },
    { group: '新闻', slices: distributions.newsStatus, labels: NEWS_STATUS_LABELS },
    { group: '资源', slices: distributions.resourceStatus, labels: RESOURCE_STATUS_LABELS },
  ];

  return groups.flatMap(group =>
    group.slices.map(slice => ({
      group: group.group,
      label: labelOf(group.labels, slice.key),
      count: slice.count,
    })),
  );
}
