import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminSubscriptionApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type AdminSubscriptionItem,
  type SubscriptionStatus,
} from '@/types/adminContent';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  pending: 'gold',
  active: 'green',
  unsubscribed: 'default',
  suppressed: 'red',
};

const STATUS_OPTIONS = (Object.keys(SUBSCRIPTION_STATUS_LABELS) as SubscriptionStatus[]).map(value => ({
  value,
  label: SUBSCRIPTION_STATUS_LABELS[value],
}));

/**
 * 订阅列表与退订抑制。
 *
 * `suppressed`（已抑制）与其他三种状态**不是一回事**，界面上必须区分开：
 * 它表示这个邮箱已经被运营侧主动拉黑（退信过多、投诉等），此后任何群发都要
 * 跳过它。把它和「已退订」混在一个筛选项里会让人以为两者等价，实际不是 ——
 * 已退订是用户的选择，已抑制是系统的判决。
 *
 * 状态可以手工改：用户来邮件要求恢复订阅时，运营需要能直接把 `suppressed`
 * 改回 `active`，而不必走一遍重新订阅的流程。
 */
export default function AdminSubscriptions() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<SubscriptionStatus | undefined>();

  const query = { pageNumber: page, pageSize, status };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.subscriptions.list(query),
    queryFn: () => adminSubscriptionApi.list(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.subscriptions.stats(),
    queryFn: () => adminSubscriptionApi.stats(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscriptions.all });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: SubscriptionStatus }) =>
      adminSubscriptionApi.updateStatus(id, next),
    onSuccess: () => {
      message.success('状态已更新');
      invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '操作失败，请稍后重试'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminSubscriptionApi.remove(id),
    onSuccess: () => {
      message.success('订阅记录已删除');
      invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const byStatus = statsQuery.data?.byStatus;

  const columns: TableProps<AdminSubscriptionItem>['columns'] = [
    { title: '邮箱', dataIndex: 'email', render: (value: string) => <Text copyable>{value}</Text> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: SubscriptionStatus) => (
        <Tag color={STATUS_COLORS[value]}>{SUBSCRIPTION_STATUS_LABELS[value]}</Tag>
      ),
    },
    {
      title: '确认时间',
      dataIndex: 'confirmedAt',
      width: 180,
      render: (value: string | null) =>
        value ? formatDateTime(value) : <Text type="secondary">未确认</Text>,
    },
    { title: '订阅时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_value, record) => (
        <Space size={4}>
          <Select
            size="small"
            style={{ width: 130 }}
            value={record.status}
            loading={statusMutation.isPending}
            onChange={next => statusMutation.mutate({ id: record.id, next })}
            options={STATUS_OPTIONS}
          />
          <Popconfirm
            title="确认删除这条订阅记录？"
            description="删除后该邮箱的退订偏好一并丢失，后续群发可能重新触达。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <SEOHead title="订阅管理" description="邮件订阅列表、状态与退订抑制。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              订阅管理
            </Title>
            <Text type="secondary">共 {data?.total ?? 0} 条</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
        </div>

        {/* 统计条：数字全部来自后端聚合，不做前端求和 —— 前端求和只统计当前页 */}
        <Row gutter={16}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic title="总订阅" value={statsQuery.data?.total ?? 0} />
            </Card>
          </Col>
          {STATUS_OPTIONS.map(option => (
            <Col key={option.value} xs={12} sm={8} lg={5}>
              <Card>
                <Statistic
                  title={option.label}
                  value={byStatus?.[option.value] ?? 0}
                  valueStyle={option.value === 'suppressed' ? { color: '#cf1322' } : undefined}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Card title="筛选">
          <Space wrap size={12}>
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 160 }}
              value={status}
              onChange={value => {
                setPage(1);
                setStatus(value);
              }}
              options={STATUS_OPTIONS}
            />
            <Button
              onClick={() => {
                setStatus(undefined);
                setPage(1);
              }}
            >
              重置
            </Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminSubscriptionItem>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 1000 }}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: total => `共 ${total} 条`,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
            }}
          />
        </Card>
      </div>
    </>
  );
}
