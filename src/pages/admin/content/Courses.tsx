import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminCourseApi, RESOURCE_STATUS_OPTIONS } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { COURSE_LEVEL_LABELS, type CourseLevel } from '@/types/content';
import {
  RESOURCE_STATUS_LABELS,
  type AdminCourseListItem,
  type ResourceStatus,
} from '@/types/adminContent';

const { Title, Text } = Typography;

const LEVEL_OPTIONS = (Object.keys(COURSE_LEVEL_LABELS) as CourseLevel[]).map(value => ({
  value,
  label: COURSE_LEVEL_LABELS[value],
}));

const STATUS_COLORS: Record<ResourceStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
};

/**
 * 课程管理列表。
 *
 * 课程是三级结构（课程 → Day → Lesson），这里只列最外层；Day 与课时的编排
 * 在 `/admin/content/courses/edit/:id` 里做。列表刻意不显示课时数 —— 后端列表
 * 接口不返回 `days`/`lessons`，为此单独发一次详情请求只为了让某一列有数字，
 * 在列表页上是净亏损。
 */
export default function AdminCourses() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [level, setLevel] = useState<CourseLevel | undefined>();
  const [status, setStatus] = useState<ResourceStatus | undefined>();

  const query = { pageNumber: page, pageSize, level, status };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.courses.list(query),
    queryFn: () => adminCourseApi.list(query),
    placeholderData: keepPreviousData,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminCourseApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.courses.all });
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const columns: TableProps<AdminCourseListItem>['columns'] = [
    {
      title: '课程标题',
      dataIndex: 'title',
      render: (_value, record) => (
        <div className="leading-tight">
          <Link
            to={`/admin/content/courses/edit/${record.id}`}
            className="font-medium text-primary hover:underline"
          >
            {record.title}
          </Link>
          <div className="text-xs text-muted-foreground">
            {record.instructor || '未填讲师'}
            {record.direction ? ` · ${record.direction}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: '难度',
      dataIndex: 'level',
      width: 100,
      render: (value: CourseLevel) => COURSE_LEVEL_LABELS[value] ?? value,
    },
    {
      title: '学时',
      dataIndex: 'duration',
      width: 120,
      render: (value: string | null) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ResourceStatus) => <Tag color={STATUS_COLORS[value]}>{RESOURCE_STATUS_LABELS[value]}</Tag>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80, align: 'right' },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_value, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/admin/content/courses/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除这门课程？"
            description="课程下的 Day 与课时会一并删除，前台不再展示。"
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
      <SEOHead title="课程管理" description="人才培养课程的发布与课节编排。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              课程管理
            </Title>
            <Text type="secondary">共 {data?.total ?? 0} 门</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/content/courses/edit/new')}
          >
            新建课程
          </Button>
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
            <Select
              allowClear
              placeholder="难度"
              style={{ width: 140 }}
              value={level}
              onChange={value => {
                setPage(1);
                setLevel(value);
              }}
              options={LEVEL_OPTIONS}
            />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 130 }}
              value={status}
              onChange={value => {
                setPage(1);
                setStatus(value);
              }}
              options={RESOURCE_STATUS_OPTIONS}
            />
            <Button
              onClick={() => {
                setLevel(undefined);
                setStatus(undefined);
                setPage(1);
              }}
            >
              重置
            </Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminCourseListItem>
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
