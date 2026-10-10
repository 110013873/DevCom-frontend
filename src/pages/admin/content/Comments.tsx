import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { AuditOutlined, ReloadOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminCommentApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import type { AdminCommentItem } from '@/types/adminContent';
import type { CommentStatus } from '@/types/content';

const { Title, Text } = Typography;

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  pending: '待审核',
  published: '已发布',
  hidden: '已隐藏',
};

const STATUS_COLORS: Record<CommentStatus, string> = {
  pending: 'gold',
  published: 'green',
  hidden: 'default',
};

/** 评论所属的载体。后端是字符串（`news`/`resource` 等），这里只做展示归一。 */
const TARGET_LABELS: Record<string, string> = {
  news: '新闻',
  resource: '资源',
  article: '文章',
  topic: '话题',
};

const TARGET_COLORS: Record<string, string> = {
  news: 'blue',
  resource: 'green',
  article: 'purple',
  topic: 'cyan',
};

/**
 * 评论与反馈审核队列。
 *
 * 新闻评论与资源反馈共用同一张表，这里**不按 targetType 拆成两个页面**：
 * 审核是"按时间顺序过一遍"的工作，拆开只会让审核员在两个队列之间来回切换、
 * 漏掉另一个。`targetType` 作为筛选项，默认显示全部。
 *
 * 三个动作的语义要分清，界面上也必须让用户分得清：
 * - **通过**（`published`）：前台可见。
 * - **隐藏**（`hidden`）：保留记录但前台不可见，用于"内容不合适但不到删除的程度"。
 * - **删除**：物理移除，不可恢复，因此单独用 Popconfirm 确认。
 *
 * 隐藏与拒绝都要求填原因 —— 后端会把 `reason` 记进审核日志，将来申诉时是凭据。
 */
export default function AdminComments() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<CommentStatus | undefined>('pending');
  const [targetType, setTargetType] = useState<string | undefined>();

  const [rejectTarget, setRejectTarget] = useState<AdminCommentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 默认只看待审的 —— 审核员的日常就是把这一列清零
  const query = { pageNumber: page, pageSize, status, targetType };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.comments.list(query),
    queryFn: () => adminCommentApi.list(query),
    placeholderData: keepPreviousData,
  });

  const pendingQuery = useQuery({
    queryKey: queryKeys.admin.comments.pendingCount(),
    queryFn: () => adminCommentApi.pendingCount(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.comments.all });
  };

  const moderateMutation = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: CommentStatus; reason?: string }) =>
      adminCommentApi.moderate(id, next, reason),
    onSuccess: () => {
      message.success('审核结果已保存');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '操作失败，请稍后重试'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminCommentApi.remove(id),
    onSuccess: () => {
      message.success('评论已删除');
      invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const columns: TableProps<AdminCommentItem>['columns'] = [
    {
      title: '评论者',
      key: 'author',
      width: 180,
      render: (_value, record) => (
        <Space size={8}>
          <Avatar size="small" src={record.authorAvatar ?? undefined}>
            {record.authorName?.[0] ?? '?'}
          </Avatar>
          <Text>{record.authorName || '已注销用户'}</Text>
        </Space>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      render: (value: string, record) => (
        <div className="leading-tight">
          <div className="whitespace-pre-wrap break-words">{value}</div>
          {record.parentId && (
            <Text type="secondary" className="text-xs">
              回复某条评论
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '所属',
      dataIndex: 'targetType',
      width: 110,
      render: (value: string) => (
        <Tag color={TARGET_COLORS[value] ?? 'default'}>{TARGET_LABELS[value] ?? value}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: CommentStatus) => <Tag color={STATUS_COLORS[value]}>{COMMENT_STATUS_LABELS[value]}</Tag>,
    },
    { title: '点赞', dataIndex: 'likeCount', width: 80, align: 'right' },
    { title: '提交时间', dataIndex: 'createTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_value, record) => (
        <Space size={4}>
          {record.status !== 'published' && (
            <Button
              type="link"
              size="small"
              onClick={() => moderateMutation.mutate({ id: record.id, next: 'published' })}
            >
              通过
            </Button>
          )}
          {record.status !== 'hidden' && (
            <Button type="link" size="small" onClick={() => setRejectTarget(record)}>
              隐藏
            </Button>
          )}
          <Popconfirm
            title="确认删除这条评论？"
            description="删除后不可恢复，回复也会一并移除。"
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
      <SEOHead title="评论审核" description="社区评论与资源反馈的审核队列。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              评论审核
            </Title>
            <Space size={8}>
              <Text type="secondary">共 {data?.total ?? 0} 条</Text>
              {(pendingQuery.data?.pending ?? 0) > 0 && (
                <Tag color="gold" icon={<AuditOutlined />}>
                  待审 {pendingQuery.data?.pending}
                </Tag>
              )}
            </Space>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
        </div>

        <Card title="筛选">
          <Space wrap size={12}>
            <Select
              allowClear
              placeholder="状态（不选为全部）"
              style={{ width: 180 }}
              value={status}
              onChange={value => {
                setPage(1);
                setStatus(value);
              }}
              options={(Object.keys(COMMENT_STATUS_LABELS) as CommentStatus[]).map(value => ({
                value,
                label: COMMENT_STATUS_LABELS[value],
              }))}
            />
            <Select
              allowClear
              placeholder="所属"
              style={{ width: 140 }}
              value={targetType}
              onChange={value => {
                setPage(1);
                setTargetType(value);
              }}
              options={(Object.keys(TARGET_LABELS) as string[]).map(value => ({
                value,
                label: TARGET_LABELS[value],
              }))}
            />
            <Button
              onClick={() => {
                setStatus('pending');
                setTargetType(undefined);
                setPage(1);
              }}
            >
              重置为待审
            </Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminCommentItem>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 1200 }}
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

      {/* 隐藏理由。不做成 Popconfirm 是因为要收集文本，而 Popconfirm 里塞输入框
          在窄屏上会挤成一团，用弹窗更稳。 */}
      <Modal
        open={Boolean(rejectTarget)}
        title="隐藏这条评论"
        okText="确认隐藏"
        okButtonProps={{ danger: true, disabled: rejectReason.trim().length === 0 }}
        cancelText="取消"
        confirmLoading={moderateMutation.isPending}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        onOk={() => {
          if (rejectTarget) {
            moderateMutation.mutate({
              id: rejectTarget.id,
              next: 'hidden',
              reason: rejectReason.trim(),
            });
          }
        }}
        destroyOnHidden
      >
        <div className="mb-3 rounded bg-muted p-3 text-sm">{rejectTarget?.content}</div>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={event => setRejectReason(event.target.value)}
          maxLength={200}
          showCount
          placeholder="填写隐藏理由，会记入审核日志"
        />
        <Text type="secondary" className="mt-2 block text-xs">
          隐藏只让前台不可见，记录仍然保留；需要彻底移除请用「删除」。
        </Text>
      </Modal>
    </>
  );
}
