import { useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import type { Tag, TagType } from '@/types/content';
import type { AdminTagPage } from '@/types/adminContent';

const { Text } = Typography;

/**
 * 标签 CRUD 接口形状。
 *
 * 由 `api/admin.ts` 的 `createTagApi` 生成的新闻/资源两套实现都符合这个形状，
 * 所以这里声明结构而不是复用某个具体对象的类型 —— 否则组件只能被其中一个端点复用，
 * 另一个会因类型不兼容而被拒。
 */
export interface TagApi {
  list(query?: { pageNumber?: number; pageSize?: number; keyword?: string }): Promise<AdminTagPage>;
  create(name: string): Promise<Tag>;
  update(id: string, name: string): Promise<Tag>;
  remove(id: string): Promise<{ deleted: true }>;
}

interface TagManagerProps {
  /** 用于级联失效的 queryKey 类型段（'news' | 'resource'），必须与 `api` 指向的端点一致 */
  type: TagType;
  api: TagApi;
  /** 面板顶部的说明文案 */
  description: string;
  /** 新建/重命名弹窗里的输入提示，各类别词表风格不同故可配 */
  namePlaceholder?: string;
}

/** 单页拉满 100 条：标签是运营侧的小词表，分页对它没意义，但接口是分页的 */
const PAGE_SIZE = 100;

/**
 * 单个标签词表的管理面板。
 *
 * 只负责「增删改查 + 重名提示」，**不含页面壳**（标题、SEO、Tabs）——
 * 这些由 `pages/admin/content/Tags.tsx` 统一提供，本组件作为其中一个 Tab 的
 * 内容挂载。此前它自带一套页面头，合并成 Tabs 后会与页面标题撞车。
 *
 * 新闻与资源是**两套独立词表**（后端 `Tag.type` 区分），交互完全一样，
 * 因此做成一个组件挂多次，而不是复制两份实现；类型差异全部由 props 注入。
 */
export default function TagManager({ type, api, description, namePlaceholder }: TagManagerProps) {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [editing, setEditing] = useState<Tag | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<{ name: string }>();

  const query = { pageNumber: 1, pageSize: PAGE_SIZE, keyword: submittedKeyword || undefined };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.tags.list(type, query),
    queryFn: () => api.list(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.tags.all(type) });

  const saveMutation = useMutation({
    mutationFn: ({ id, name }: { id?: string; name: string }) =>
      id ? api.update(id, name) : api.create(name),
    onSuccess: (_result, variables) => {
      message.success(variables.id ? '标签已更新' : '标签已创建');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      message.success('已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    form.setFieldsValue({ name: tag.name });
    setModalOpen(true);
  };

  const columns: TableProps<Tag>['columns'] = [
    { title: '标签名', dataIndex: 'name' },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      width: 120,
      align: 'right',
      /**
       * 后端在删除标签时并不检查引用，使用次数只增不减地反映历史绑定。
       * 数字>0 时给出提示，避免运营以为删除后内容也跟着更新。
       */
      render: (value: number) =>
        value > 0 ? <Text>{value}</Text> : <Text type="secondary">0</Text>,
    },
    { title: '创建时间', dataIndex: 'createTime', width: 200, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            重命名
          </Button>
          <Popconfirm
            title="确认删除这个标签？"
            description="已绑定该标签的内容不会自动更新，前台将不再显示它。"
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
      <Text type="secondary" className="mb-4 block">
        {description}
      </Text>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Text type="secondary">共 {data?.total ?? 0} 条</Text>
        <Space wrap size={12}>
          <Input
            allowClear
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            onPressEnter={() => setSubmittedKeyword(keyword.trim())}
            placeholder="标签名关键词"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={() => setSubmittedKeyword(keyword.trim())}>
            查询
          </Button>
          <Button
            onClick={() => {
              setKeyword('');
              setSubmittedKeyword('');
            }}
          >
            重置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建标签
          </Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Tag>
          rowKey="id"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={isFetching}
          pagination={false}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? '重命名标签' : '新建标签'}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={() => void form.submit()}
        destroyOnHidden
      >
        <Form<{ name: string }>
          form={form}
          layout="vertical"
          onFinish={values => saveMutation.mutate({ id: editing?.id, name: values.name.trim() })}
        >
          <Form.Item
            name="name"
            label="标签名"
            rules={[
              { required: true, message: '请输入标签名' },
              { max: 40, message: '标签名最多 40 字' },
            ]}
          >
            <Input placeholder={namePlaceholder} maxLength={40} autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
