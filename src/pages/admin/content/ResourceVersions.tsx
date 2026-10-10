import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminResourceApi, RESOURCE_STATUS_OPTIONS } from '@/api/admin';
import { uploadFile } from '@/api/upload';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import {
  RESOURCE_STATUS_LABELS,
  type AdminResourceFile,
  type AdminResourceVersion,
  type ResourceStatus,
  type UpsertResourceFilePayload,
  type UpsertResourceVersionPayload,
} from '@/types/adminContent';

const { Title, Text } = Typography;

/** 展示用的文件体积。后端给的是 bigint 序列化后的字符串，先转数字再格式化。 */
function formatSize(size: string): string {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * 资源版本与文件管理。路由 `/admin/content/resources/:id/versions`。
 *
 * 层级：资源 → 版本 → 文件。一个版本下可以有多个平台/架构的文件
 * （例如同一个版本的 x86_64 与 riscv64 两个包），这正是不把文件字段
 * 平铺在版本行上的原因。
 *
 * ⚠️ 默认版本是**互斥**的：后端在切换时用事务保证同一资源只有一个
 * `isDefault = true`。界面上因此用单选语义（点击设置），而不是开关 ——
 * 开关会让用户误以为可以把多个版本都打开。
 */
export default function AdminResourceVersions() {
  const { id: resourceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();

  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AdminResourceVersion | null>(null);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileTargetVersion, setFileTargetVersion] = useState<AdminResourceVersion | null>(null);
  const [uploading, setUploading] = useState(false);
  const [versionForm] = Form.useForm<UpsertResourceVersionPayload>();
  const [fileForm] = Form.useForm<UpsertResourceFilePayload>();

  const resourceQuery = useQuery({
    queryKey: queryKeys.admin.resources.detail(resourceId as string),
    queryFn: () => adminResourceApi.detail(resourceId as string),
    enabled: Boolean(resourceId),
  });

  const versionsQuery = useQuery({
    queryKey: queryKeys.admin.resources.versions(resourceId as string),
    queryFn: () => adminResourceApi.versions(resourceId as string),
    enabled: Boolean(resourceId),
    placeholderData: keepPreviousData,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.resources.versions(resourceId as string) });

  const saveVersionMutation = useMutation({
    mutationFn: (payload: UpsertResourceVersionPayload) =>
      editingVersion
        ? adminResourceApi.updateVersion(resourceId as string, editingVersion.id, payload)
        : adminResourceApi.createVersion(resourceId as string, payload),
    onSuccess: () => {
      message.success(editingVersion ? '版本已更新' : '版本已创建');
      setVersionModalOpen(false);
      setEditingVersion(null);
      versionForm.resetFields();
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '保存失败，请稍后重试'),
  });

  const removeVersionMutation = useMutation({
    mutationFn: (versionId: string) => adminResourceApi.removeVersion(resourceId as string, versionId),
    onSuccess: () => {
      message.success('版本已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const saveFileMutation = useMutation({
    mutationFn: (payload: UpsertResourceFilePayload) =>
      adminResourceApi.addFile(resourceId as string, fileTargetVersion?.id as string, payload),
    onSuccess: () => {
      message.success('文件已添加');
      setFileModalOpen(false);
      fileForm.resetFields();
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '添加失败'),
  });

  const removeFileMutation = useMutation({
    mutationFn: (fileId: string) => adminResourceApi.removeFile(fileId),
    onSuccess: () => {
      message.success('文件已删除');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '删除失败'),
  });

  const openVersionModal = (version?: AdminResourceVersion) => {
    setEditingVersion(version ?? null);
    versionForm.resetFields();
    if (version) {
      versionForm.setFieldsValue({
        version: version.version,
        name: version.name,
        description: version.description ?? undefined,
        changelog: version.changelog ?? undefined,
        giteeUrl: version.giteeUrl ?? undefined,
        githubUrl: version.githubUrl ?? undefined,
        status: version.status,
        isDefault: version.isDefault,
      });
    } else {
      versionForm.setFieldsValue({ status: 'draft', isDefault: false });
    }
    setVersionModalOpen(true);
  };

  const openFileModal = (version: AdminResourceVersion) => {
    setFileTargetVersion(version);
    fileForm.resetFields();
    setFileModalOpen(true);
  };

  /**
   * 文件上传。
   *
   * 先传 OSS 拿到 `storageKey` / `url`，再落库成 `ResourceFile` —— 顺序不能反：
   * 数据库里存的是已存在的对象地址，先写库再传文件会留下指向空对象的记录。
   * 上传成功后把拿到的地址回填进表单，其余字段（架构、校验和）由运营补充。
   */
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, 'resource');
      fileForm.setFieldsValue({
        fileName: uploaded.originalName,
        size: uploaded.size,
        storageKey: uploaded.url,
        url: uploaded.url,
      });
      message.success('上传成功，请补充文件信息后保存');
    } catch (error) {
      message.error(error instanceof ApiError ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const versionColumns: TableProps<AdminResourceVersion>['columns'] = [
    {
      title: '版本',
      dataIndex: 'version',
      width: 130,
      render: (value: string, record) => (
        <Space size={4}>
          <Text strong>{value}</Text>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: ResourceStatus) => (
        <Tag color={value === 'published' ? 'green' : value === 'archived' ? 'orange' : 'default'}>
          {RESOURCE_STATUS_LABELS[value]}
        </Tag>
      ),
    },
    {
      title: '文件数',
      dataIndex: 'files',
      width: 90,
      align: 'right',
      render: (files: AdminResourceFile[]) => files.length,
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 180, render: formatDateTime },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openFileModal(record)}>
            添加文件
          </Button>
          <Button type="link" size="small" onClick={() => openVersionModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除这个版本？"
            description="版本下的文件记录会一并删除。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeVersionMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fileColumns: TableProps<AdminResourceFile>['columns'] = [
    { title: '文件名', dataIndex: 'fileName' },
    {
      title: '平台/架构',
      dataIndex: 'osArch',
      width: 140,
      render: (value: string | null) => value || <Text type="secondary">-</Text>,
    },
    {
      title: '体积',
      dataIndex: 'size',
      width: 110,
      align: 'right',
      render: formatSize,
    },
    {
      title: '校验和',
      dataIndex: 'checksum',
      width: 200,
      render: (value: string | null) =>
        value ? <Text code>{value.slice(0, 16)}…</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" href={record.url} target="_blank" rel="noreferrer">
            下载
          </Button>
          <Popconfirm
            title="确认删除这个文件记录？"
            description="仅删除数据库记录，OSS 上的对象不会被清理。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => removeFileMutation.mutate(record.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (versionsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  const versions = versionsQuery.data?.items ?? [];

  return (
    <>
      <SEOHead title="资源版本管理" description="维护资源的版本与可下载文件。" />
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/admin/content/resources')}
              >
                返回
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                {resourceQuery.data?.name ?? '资源'} · 版本管理
              </Title>
            </Space>
            <div className="mt-2">
              <Text type="secondary">共 {versions.length} 个版本</Text>
            </div>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void versionsQuery.refetch()}
              loading={versionsQuery.isFetching}
            >
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openVersionModal()}>
              新建版本
            </Button>
          </Space>
        </div>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminResourceVersion>
            rowKey="id"
            columns={versionColumns}
            dataSource={versions}
            pagination={false}
            expandable={{
              /**
               * 文件表格内嵌在版本行下，不再单独请求 —— 接口已把 `files` 一并返回，
               * 展开时二次请求只会拖慢交互。
               */
              expandedRowRender: record =>
                record.files.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="该版本还没有文件"
                    style={{ margin: '8px 0' }}
                  >
                    <Button size="small" icon={<PlusOutlined />} onClick={() => openFileModal(record)}>
                      添加文件
                    </Button>
                  </Empty>
                ) : (
                  <Table<AdminResourceFile>
                    rowKey="id"
                    size="small"
                    columns={fileColumns}
                    dataSource={record.files}
                    pagination={false}
                  />
                ),
              rowExpandable: () => true,
            }}
          />
        </Card>
      </div>

      {/* ---------------- 版本表单 ---------------- */}
      <Modal
        open={versionModalOpen}
        title={editingVersion ? '编辑版本' : '新建版本'}
        okText="保存"
        cancelText="取消"
        width={640}
        confirmLoading={saveVersionMutation.isPending}
        onCancel={() => {
          setVersionModalOpen(false);
          setEditingVersion(null);
        }}
        onOk={() => void versionForm.submit()}
        destroyOnHidden
      >
        <Form<UpsertResourceVersionPayload>
          form={versionForm}
          layout="vertical"
          onFinish={values =>
            saveVersionMutation.mutate({
              ...values,
              version: values.version.trim(),
              name: values.name.trim(),
            })
          }
        >
          <Space size={16} className="w-full">
            <Form.Item
              name="version"
              label="版本号"
              rules={[{ required: true, message: '请输入版本号' }, { max: 50 }]}
              style={{ width: 220 }}
            >
              <Input placeholder="例如 1.0.0" maxLength={50} />
            </Form.Item>
            <Form.Item
              name="name"
              label="版本名称"
              rules={[{ required: true, message: '请输入版本名称' }, { max: 200 }]}
              style={{ width: 340 }}
            >
              <Input placeholder="例如 首个稳定版" maxLength={200} />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="版本说明">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="changelog" label="更新日志" extra="支持 Markdown">
            <Input.TextArea rows={5} maxLength={5000} />
          </Form.Item>
          <Space size={16} className="w-full">
            <Form.Item name="giteeUrl" label="Gitee 地址" style={{ width: 300 }}>
              <Input placeholder="可留空" />
            </Form.Item>
            <Form.Item name="githubUrl" label="GitHub 地址" style={{ width: 300 }}>
              <Input placeholder="可留空" />
            </Form.Item>
          </Space>
          <Space size={16}>
            <Form.Item name="status" label="状态" style={{ width: 160 }}>
              <Select options={RESOURCE_STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="isDefault"
              label="设为默认版本"
              valuePropName="checked"
              extra="同一资源只能有一个默认版本"
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ---------------- 文件表单 ---------------- */}
      <Modal
        open={fileModalOpen}
        title={`添加文件 · ${fileTargetVersion?.version ?? ''}`}
        okText="保存"
        cancelText="取消"
        width={600}
        confirmLoading={saveFileMutation.isPending}
        onCancel={() => {
          setFileModalOpen(false);
          setFileTargetVersion(null);
        }}
        onOk={() => void fileForm.submit()}
        destroyOnHidden
      >
        <Form<UpsertResourceFilePayload>
          form={fileForm}
          layout="vertical"
          onFinish={values =>
            saveFileMutation.mutate({
              ...values,
              fileName: values.fileName.trim(),
              size: Number(values.size) || 0,
            })
          }
        >
          <Form.Item label="文件" required extra="上传成功后文件名与地址会自动填入下方表单">
            <input
              type="file"
              className="block w-full text-sm"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
              }}
            />
          </Form.Item>
          {uploading && <Spin className="mb-3" />}
          <Form.Item
            name="fileName"
            label="文件名"
            rules={[{ required: true, message: '请填写文件名' }, { max: 200 }]}
          >
            <Input placeholder="例如 rvv-compiler-1.0.0-linux-riscv64.tar.gz" maxLength={200} />
          </Form.Item>
          <Space size={16} className="w-full">
            <Form.Item
              name="osArch"
              label="平台/架构"
              style={{ width: 220 }}
              extra="例如 linux-riscv64"
            >
              <Input placeholder="可留空" maxLength={80} />
            </Form.Item>
            <Form.Item name="size" label="体积（字节）" style={{ width: 220 }}>
              <Input type="number" placeholder="0" />
            </Form.Item>
          </Space>
          <Form.Item name="checksum" label="校验和" extra="建议填写 SHA-256，前台会展示给下载者">
            <Input placeholder="可留空" maxLength={200} />
          </Form.Item>
          {/* 这两个字段由上传回填，正常不需要手改；不做成 disabled 是为了让上传失败时仍可手动填 */}
          <Form.Item
            name="storageKey"
            label="存储键"
            rules={[{ required: true, message: '请先上传文件' }]}
          >
            <Input placeholder="上传后自动填入" />
          </Form.Item>
          <Form.Item name="url" label="访问地址" rules={[{ required: true, message: '请先上传文件' }]}>
            <Input placeholder="上传后自动填入" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
