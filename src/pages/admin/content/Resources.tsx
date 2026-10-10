import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminResourceApi, RESOURCE_STATUS_OPTIONS } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import {
  RESOURCE_CATEGORY_LABELS,
  type ResourceCategory,
} from '@/types/content';
import {
  RESOURCE_STATUS_LABELS,
  type AdminResourceListItem,
  type ResourceStatus,
} from '@/types/adminContent';

const { Title, Text } = Typography;

/** 分类下拉的选项：词表是固定枚举（不是可运营配置），直接由常量生成 */
const CATEGORY_OPTIONS = (Object.keys(RESOURCE_CATEGORY_LABELS) as ResourceCategory[]).map(value => ({
  value,
  label: RESOURCE_CATEGORY_LABELS[value],
}));

const STATUS_COLORS: Record<ResourceStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
};

/**
 * 资源管理列表。
 *
 * 与新闻列表的结构一致，差别在两处业务语义：
 * 1. `isPublic` 是「是否对未登录访客可见」的硬开关，下载接口会据此校验，
 *    所以它在列表里用醒目色标出，而不是塞进详情才看得到。
 * 2. `ratingAvg` 来自列表接口，已被后端归一为数字，可以直接 `toFixed(1)`；
 *    详情接口返回的是字符串，那边要另行 `Number(...)`。
 */
export default function AdminResources() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [category, setCategory] = useState<ResourceCategory | undefined>();
  const [status, setStatus] = useState<ResourceStatus | undefined>();
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const query = {
    pageNumber: page,
    pageSize,
    category,
    status,
    keyword: submittedKeyword || undefined,
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.resources.list(query),
    queryFn: () => adminResourceApi.list(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.resources.all });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminResourceApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const resetFilters = () => {
    setKeyword('');
    setSubmittedKeyword('');
    setCategory(undefined);
    setStatus(undefined);
    setPage(1);
  };

  const columns: TableProps<AdminResourceListItem>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_value, record) => (
        <div className="leading-tight">
          <Link
            to={`/admin/content/resources/edit/${record.id}`}
            className="font-medium text-primary hover:underline"
          >
            {record.name}
          </Link>
          <div className="line-clamp-1 text-xs text-muted-foreground">{record.summary}</div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 110,
      render: (value: ResourceCategory) => RESOURCE_CATEGORY_LABELS[value] ?? value,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 180,
      render: (tags: AdminResourceListItem['tags']) =>
        tags.length === 0 ? (
          <Text type="secondary">-</Text>
        ) : (
          <Space size={[4, 4]} wrap>
            {tags.map(tag => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ResourceStatus) => <Tag color={STATUS_COLORS[value]}>{RESOURCE_STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '可见性',
      dataIndex: 'isPublic',
      width: 100,
      // 隐藏资源对前台不可见，用红色标签把它和普通草稿区分开
      render: (isPublic: boolean) =>
        isPublic ? <Tag color="blue">公开</Tag> : <Tag color="red">已隐藏</Tag>,
    },
    {
      title: '下载量',
      dataIndex: 'downloadCount',
      width: 90,
      align: 'right',
    },
    {
      title: '评分',
      dataIndex: 'ratingAvg',
      width: 120,
      render: (value: number, record) =>
        record.ratingCount > 0 ? (
          <Text>
            {Number(value).toFixed(1)} <Text type="secondary">({record.ratingCount})</Text>
          </Text>
        ) : (
          <Text type="secondary">暂无评分</Text>
        ),
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_value, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/admin/content/resources/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/admin/content/resources/${record.id}/versions`)}
          >
            版本
          </Button>
          <Popconfirm
            title="确认删除这个资源？"
            description="版本与文件会一并删除，前台不再展示。"
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
      <SEOHead title="资源管理" description="社区资源库的发布与版本维护。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              资源管理
            </Title>
            <Text type="secondary">共 {data?.total ?? 0} 条</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/content/resources/edit/new')}
          >
            新建资源
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
            <Input
              allowClear
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              onPressEnter={() => {
                setPage(1);
                setSubmittedKeyword(keyword.trim());
              }}
              placeholder="资源名称关键词"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder="分类"
              style={{ width: 150 }}
              value={category}
              onChange={value => {
                setPage(1);
                setCategory(value);
              }}
              options={CATEGORY_OPTIONS}
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
              type="primary"
              onClick={() => {
                setPage(1);
                setSubmittedKeyword(keyword.trim());
              }}
            >
              查询
            </Button>
            <Button onClick={resetFilters}>重置</Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminResourceListItem>
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
    </>
  );
}
