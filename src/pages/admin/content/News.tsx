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
  Switch,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminNewsApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { NEWS_STATUS_LABELS, type AdminNewsListItem, type NewsStatus } from '@/types/adminContent';

const { Title, Text } = Typography;

/** 状态标签配色：草稿灰、已发布绿、已归档橙 —— 与前台的状态语义一致 */
const STATUS_COLORS: Record<NewsStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
};

/**
 * 新闻管理列表。
 *
 * 分类下拉**必须**取自后端下发的词表（`useSiteConfig().newsCategories`）而不是
 * 本地常量：词表由运营在「站点配置」里维护，前端写死会出现「后台改了分类，
 * 筛选框里还是旧的」这种漂移。这也是当初把词表挪到后端配置的原因。
 */
export default function AdminNews() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { newsCategories, newsCategoryLabel } = useSiteConfig();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<NewsStatus | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [featured, setFeatured] = useState<boolean | undefined>();
  const [keyword, setKeyword] = useState('');
  /** 已提交的关键词：与输入框分离，避免每敲一个字发一次请求 */
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const query = {
    pageNumber: page,
    pageSize,
    status,
    category,
    // 后端的 `featured` 是字符串开关，只有传 'true' 才过滤
    featured: featured ? 'true' : undefined,
    keyword: submittedKeyword || undefined,
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.news.list(query),
    queryFn: () => adminNewsApi.list(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.news.all });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: NewsStatus }) => adminNewsApi.updateStatus(id, next),
    onSuccess: (_result, variables) => {
      message.success(`已${NEWS_STATUS_LABELS[variables.next]}`);
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '状态更新失败'),
  });

  const featureMutation = useMutation({
    // 显式传布尔值：后端是 `isFeatured !== false` 判定，传 undefined 会意外置顶
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => adminNewsApi.setFeatured(id, isFeatured),
    onSuccess: (_result, variables) => {
      message.success(variables.isFeatured ? '已置顶' : '已取消置顶');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '置顶操作失败'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminNewsApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const resetFilters = () => {
    setKeyword('');
    setSubmittedKeyword('');
    setStatus(undefined);
    setCategory(undefined);
    setFeatured(undefined);
    setPage(1);
  };

  const columns: TableProps<AdminNewsListItem>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
      render: (_value, record) => (
        <div className="leading-tight">
          <Link to={`/admin/content/news/edit/${record.id}`} className="font-medium text-primary hover:underline">
            {record.title}
          </Link>
          {record.subtitle && (
            <div className="text-xs text-muted-foreground">{record.subtitle}</div>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (value: string) => newsCategoryLabel(value) || '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (tags: AdminNewsListItem['tags']) =>
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
      render: (value: NewsStatus) => <Tag color={STATUS_COLORS[value]}>{NEWS_STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '置顶',
      dataIndex: 'isFeatured',
      width: 80,
      render: (value: boolean, record) => (
        <Switch
          size="small"
          checked={value}
          loading={featureMutation.isPending && featureMutation.variables?.id === record.id}
          onChange={checked => featureMutation.mutate({ id: record.id, isFeatured: checked })}
        />
      ),
    },
    {
      title: '浏览量',
      dataIndex: 'viewCount',
      width: 90,
      align: 'right',
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => navigate(`/admin/content/news/edit/${record.id}`)}>
            编辑
          </Button>
          {record.status === 'published' ? (
            <Button
              type="link"
              size="small"
              onClick={() => statusMutation.mutate({ id: record.id, next: 'draft' })}
            >
              转草稿
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => statusMutation.mutate({ id: record.id, next: 'published' })}
            >
              发布
            </Button>
          )}
          <Popconfirm
            title="确认删除这条新闻？"
            description="删除后前台不再展示。"
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
      <SEOHead title="新闻管理" description="社区新闻的发布、置顶与归档。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              新闻管理
            </Title>
            <Text type="secondary">共 {data?.total ?? 0} 条</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/content/news/edit/new')}>
            新建新闻
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
              placeholder="标题关键词"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
            />
            <Select
              allowClear
              placeholder="分类"
              style={{ width: 160 }}
              value={category}
              onChange={value => {
                setPage(1);
                setCategory(value);
              }}
              options={newsCategories.map(item => ({ value: item.value, label: item.label }))}
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
              options={(Object.keys(NEWS_STATUS_LABELS) as NewsStatus[]).map(value => ({
                value,
                label: NEWS_STATUS_LABELS[value],
              }))}
            />
            <Select
              allowClear
              placeholder="是否置顶"
              style={{ width: 130 }}
              value={featured}
              onChange={value => {
                setPage(1);
                setFeatured(value);
              }}
              options={[
                { value: true, label: '仅置顶' },
                { value: false, label: '全部' },
              ]}
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
          <Table<AdminNewsListItem>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 1280 }}
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
