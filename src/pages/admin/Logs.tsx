import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Card, DatePicker, Descriptions, Drawer, Input, Select, Space, Table, Tag, Tooltip, Typography, type TableProps } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import SEOHead from '@/components/common/SEOHead';
import { adminLogApi } from '@/api/admin';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { summariseJson } from '@/lib/text';
import type { AuditLogItem, AuditStatus } from '@/types/admin';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/** 模块下拉项，与后端 `AUDIT_MODULES` 一一对应 */
const MODULE_OPTIONS = [
  { value: 'auth', label: '认证' },
  { value: 'user', label: '用户' },
  { value: 'news', label: '新闻' },
  { value: 'resource', label: '资源' },
  { value: 'course', label: '课程' },
  { value: 'legal', label: '协议' },
  { value: 'upload', label: '上传' },
  { value: 'system', label: '系统' },
];

/** `status` 描述的是操作结果的严重度，不是账号状态 */
const STATUS_META: Record<AuditStatus, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  warning: { label: '警告', color: 'orange' },
  danger: { label: '危险', color: 'red' },
};

/**
 * 操作日志。只读列表，按模块 / 动作 / 结果 / 时间区间筛选。
 * 日志由后端在每次管理写操作时落库，此处不做任何修改入口。
 */
export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [module, setModule] = useState<string | undefined>();
  const [status, setStatus] = useState<AuditStatus | undefined>();
  const [action, setAction] = useState('');
  const [submittedAction, setSubmittedAction] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [detail, setDetail] = useState<AuditLogItem | null>(null);

  const query = {
    pageNumber: page,
    pageSize,
    module,
    status,
    action: submittedAction || undefined,
    // 按北京时间选中的区间换算成 UTC 后再比较，避免时区偏移导致边界日志漏掉
    startTime: range?.[0].startOf('day').toISOString(),
    endTime: range?.[1].endOf('day').toISOString(),
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.logs.list(query),
    queryFn: () => adminLogApi.list(query),
    placeholderData: keepPreviousData,
  });

  const resetFilters = () => {
    setModule(undefined);
    setStatus(undefined);
    setAction('');
    setSubmittedAction('');
    setRange(null);
    setPage(1);
  };

  const columns: TableProps<AuditLogItem>['columns'] = [
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    { title: '操作人', dataIndex: 'adminName', width: 120 },
    { title: '动作', dataIndex: 'action', width: 140 },
    {
      title: '模块',
      dataIndex: 'module',
      width: 90,
      render: (value: string | null) => MODULE_OPTIONS.find(option => option.value === value)?.label ?? value ?? '-',
    },
    {
      title: '结果',
      dataIndex: 'status',
      width: 90,
      render: (value: AuditStatus) => <Tag color={STATUS_META[value].color}>{STATUS_META[value].label}</Tag>,
    },
    {
      title: '对象',
      dataIndex: 'targetType',
      width: 180,
      render: (value: string | null, record) =>
        value ? (
          <Text type="secondary" className="text-xs">
            {value}
            {record.targetId ? ` · ${record.targetId.slice(0, 8)}` : ''}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 130,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: '详情',
      dataIndex: 'details',
      render: details => (
        <Tooltip title={details ? JSON.stringify(details, null, 2) : undefined}>
          <Text type="secondary" className="text-xs">
            {summariseJson(details)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_value, record) => (
        <Button type="link" size="small" onClick={() => setDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <>
      <SEOHead title="操作日志" description="社区后台管理操作的审计记录。" />
      <div className="space-y-4">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            操作日志
          </Title>
          <Text type="secondary">共 {data?.total ?? 0} 条记录</Text>
        </div>

        <Card
          title="筛选"
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
              刷新
            </Button>
          }
        >
          <Space wrap size={12}>
            <Input
              allowClear
              value={action}
              onChange={event => setAction(event.target.value)}
              onPressEnter={() => {
                setPage(1);
                setSubmittedAction(action.trim());
              }}
              placeholder="动作关键词"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
            />
            <Select
              allowClear
              placeholder="模块"
              style={{ width: 140 }}
              value={module}
              onChange={value => {
                setPage(1);
                setModule(value);
              }}
              options={MODULE_OPTIONS}
            />
            <Select
              allowClear
              placeholder="结果"
              style={{ width: 120 }}
              value={status}
              onChange={value => {
                setPage(1);
                setStatus(value);
              }}
              options={Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
            />
            <RangePicker
              value={range}
              onChange={value => {
                setPage(1);
                setRange(value && value[0] && value[1] ? [value[0], value[1]] : null);
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                setPage(1);
                setSubmittedAction(action.trim());
              }}
            >
              查询
            </Button>
            <Button onClick={resetFilters}>重置</Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AuditLogItem>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 1400 }}
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

      <Drawer title="日志详情" width={520} open={Boolean(detail)} onClose={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="时间">{formatDateTime(detail.createTime)}</Descriptions.Item>
            <Descriptions.Item label="操作人">{detail.adminName}</Descriptions.Item>
            <Descriptions.Item label="动作">{detail.action}</Descriptions.Item>
            <Descriptions.Item label="模块">{detail.module ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="结果">
              <Tag color={STATUS_META[detail.status].color}>{STATUS_META[detail.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="目标类型">{detail.targetType ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="目标 ID">{detail.targetId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="原因">{detail.reason ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="IP">{detail.ip ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="详情">
              <pre className="m-0 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">
                {detail.details ? JSON.stringify(detail.details, null, 2) : '-'}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
