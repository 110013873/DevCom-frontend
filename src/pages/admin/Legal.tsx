import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import SEOHead from '@/components/common/SEOHead';
import { adminSystemApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { useAuth } from '@/contexts/AuthContext';
import { isSysAdmin as hasSysAdminRole } from '@/types/user';
import type { LegalDocumentVersion, UpsertLegalDocumentPayload } from '@/types/admin';

const { Title, Text } = Typography;

const TYPE_LABELS: Record<LegalDocumentVersion['type'], string> = {
  user_agreement: '用户协议',
  privacy_policy: '隐私政策',
};

const TYPE_OPTIONS = [
  { value: 'user_agreement', label: TYPE_LABELS.user_agreement },
  { value: 'privacy_policy', label: TYPE_LABELS.privacy_policy },
];

interface EditorValues {
  type: LegalDocumentVersion['type'];
  version: string;
  effectiveDate: Dayjs;
  contentHtml: string;
  isActive: boolean;
}

/**
 * 协议 / 隐私政策维护。
 *
 * 正文用普通 TextArea 而不是富文本编辑器：协议内容是法律文本，粘贴 Markdown/HTML
 * 源文比可视化编辑更可控，也避免编辑器把标签改写掉。写入的 `contentHtml` 会由前台
 * 渲染管线做净化后展示。
 */
export default function AdminLegal() {
  const { message, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSysAdmin = hasSysAdminRole(user);

  const [type, setType] = useState<LegalDocumentVersion['type'] | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editorOpen, setEditorOpen] = useState(false);
  /** 正在编辑的版本；为空表示新建 */
  const [editing, setEditing] = useState<LegalDocumentVersion | null>(null);
  const [form] = Form.useForm<EditorValues>();

  const query = { type, pageNumber: page, pageSize };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.legal.list(query),
    queryFn: () => adminSystemApi.listLegalDocuments(query),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertLegalDocumentPayload) => adminSystemApi.saveLegalDocument(payload),
    onSuccess: () => {
      message.success('已保存');
      setEditorOpen(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.legal.all });
      // 前台协议页读的是同一份数据，一并刷新缓存
      void queryClient.invalidateQueries({ queryKey: ['legal'] });
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败'),
  });

  /** 打开编辑器。编辑既有版本时先取回正文，因为列表接口不返回大文本。 */
  const openEditor = async (record: LegalDocumentVersion | null) => {
    if (!isSysAdmin) {
      message.warning('协议维护仅系统管理员可操作');
      return;
    }
    setEditing(record);
    if (!record) {
      const nextVersion = String((data?.items.length ?? 0) + 1);
      form.setFieldsValue({
        type: type ?? 'user_agreement',
        version: `v${nextVersion}`,
        effectiveDate: dayjs(),
        contentHtml: '',
        isActive: true,
      });
      setEditorOpen(true);
      return;
    }
    try {
      const detail = await adminSystemApi.legalDocumentDetail(record.id);
      form.setFieldsValue({
        type: detail.type,
        version: detail.version,
        effectiveDate: dayjs(detail.effectiveDate),
        contentHtml: detail.contentHtml,
        isActive: detail.isActive,
      });
      setEditorOpen(true);
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '无法加载协议正文');
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    const payload: UpsertLegalDocumentPayload = {
      type: values.type,
      version: values.version.trim(),
      effectiveDate: values.effectiveDate.toISOString(),
      contentHtml: values.contentHtml,
      isActive: values.isActive,
    };
    // 启用新版本会让同类型的当前版本下线，属于对外可见的变更，先确认再提交
    if (payload.isActive && !editing?.isActive) {
      modal.confirm({
        title: '确认启用该版本？',
        content: `启用后，${TYPE_LABELS[payload.type]}当前生效的版本会自动下线，前台立即展示这一版。`,
        okText: '确认启用',
        cancelText: '取消',
        onOk: () => saveMutation.mutateAsync(payload).then(() => undefined),
      });
      return;
    }
    await saveMutation.mutateAsync(payload);
  };

  const columns: TableProps<LegalDocumentVersion>['columns'] = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (value: LegalDocumentVersion['type']) => TYPE_LABELS[value],
    },
    { title: '版本', dataIndex: 'version', width: 100 },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 100,
      render: (value: boolean) => (value ? <Tag color="green">生效中</Tag> : <Tag>历史版本</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_value, record) => (
        <Button type="link" size="small" onClick={() => void openEditor(record)} disabled={!isSysAdmin}>
          查看 / 编辑
        </Button>
      ),
    },
  ];

  return (
    <>
      <SEOHead title="协议维护" description="用户协议与隐私政策的版本管理。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              协议维护
            </Title>
            <Text type="secondary">共 {data?.total ?? 0} 个版本</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!isSysAdmin}
              onClick={() => void openEditor(null)}
            >
              新增版本
            </Button>
          </Space>
        </div>

        {!isSysAdmin && (
          <Alert
            type="info"
            showIcon
            message="协议维护仅系统管理员可操作。"
            description="你当前可以查看所有版本，但无法新增或修改。"
          />
        )}

        <Card
          title="筛选"
          extra={
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: 160 }}
              value={type}
              onChange={value => {
                setPage(1);
                setType(value);
              }}
              options={TYPE_OPTIONS}
            />
          }
        >
          <Table<LegalDocumentVersion>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 900 }}
            pagination={{
              current: page,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: total => `共 ${total} 条`,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
            }}
          />
        </Card>
      </div>

      <Modal
        title={editing ? `编辑版本 ${editing.version}` : '新增协议版本'}
        open={editorOpen}
        width={860}
        onCancel={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onOk={() => void submit()}
        confirmLoading={saveMutation.isPending}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="pt-2">
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
              {/* 已有版本不允许换类型：同 type+version 才是唯一键，换了会串版本历史 */}
              <Select options={TYPE_OPTIONS} disabled={Boolean(editing)} />
            </Form.Item>
            <Form.Item
              name="version"
              label="版本号"
              rules={[
                { required: true, message: '请填写版本号' },
                { max: 20, message: '版本号不超过 20 个字符' },
              ]}
              extra="同类型下版本号唯一，例如 v1、2026-01。"
            >
              <Input maxLength={20} disabled={Boolean(editing)} />
            </Form.Item>
            <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true, message: '请选择生效日期' }]}>
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="contentHtml"
            label="正文"
            rules={[{ required: true, message: '请填写正文' }]}
            extra="支持 HTML 或 Markdown 源文，前台渲染时会做净化处理。"
          >
            <Input.TextArea rows={16} placeholder="粘贴协议正文…" />
          </Form.Item>

          <Form.Item name="isActive" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>保存后立即启用（同类型的其他版本将自动下线）</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
