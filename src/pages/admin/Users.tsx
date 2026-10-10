import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Drawer,
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
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import SEOHead from '@/components/common/SEOHead';
import { adminUserApi } from '@/api/admin';
import { ApiError } from '@/lib/http';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime } from '@/lib/datetime';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_ROLES, ROLE_LABELS, canManageUser, isSysAdmin as hasSysAdminRole } from '@/types/user';
import type { AdminUserProfile, UserStatus } from '@/types/admin';

const { Title, Text } = Typography;

/** 角色标签的颜色：管理角色暖色，其余冷色，便于一眼分辨权限层级 */
const ROLE_COLORS: Record<string, string> = {
  sys_admin: 'red',
  ops_admin: 'volcano',
  mentor: 'gold',
  moderator: 'purple',
  author: 'blue',
  member: 'cyan',
  visitor: 'default',
};

const STATUS_LABELS: Record<UserStatus, string> = { active: '正常', banned: '已封禁' };

/** 可授予的角色顺序，与后端 `ALL_ROLES` 一致（从高到低） */
const ROLE_OPTIONS = ['visitor', 'member', 'author', 'moderator', 'mentor', 'ops_admin', 'sys_admin'].map(code => ({
  value: code,
  label: ROLE_LABELS[code] ?? code,
}));

/** 管理角色：只有系统管理员才能授予或收回，与后端 `assertMayTouchAdmins` 对应 */
const ADMIN_ROLE_CODES = ADMIN_ROLES;

/**
 * 用户管理。列表支持状态/角色/关键词筛选；
 * 封禁、调角色、改资料三个写操作各自弹窗，避免误触。
 */
export default function AdminUsers() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<UserStatus | undefined>();
  const [role, setRole] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  /** 已提交的关键词。与输入框分离，避免每敲一个字就发一次请求。 */
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const [detail, setDetail] = useState<AdminUserProfile | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserProfile | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUserProfile | null>(null);
  const [profileTarget, setProfileTarget] = useState<AdminUserProfile | null>(null);
  const [banForm] = Form.useForm<{ reason: string }>();
  const [roleForm] = Form.useForm<{ roles: string[] }>();
  const [profileForm] = Form.useForm<{ displayName: string; bio?: string }>();

  const isSysAdmin = hasSysAdminRole(currentUser);
  /** 涉及管理角色的账号仅系统管理员可操作 */
  const lockedFor = (target: AdminUserProfile) => !canManageUser(currentUser, target);

  const query = { pageNumber: page, pageSize, status, role, keyword: submittedKeyword || undefined };

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.admin.users.list(query),
    queryFn: () => adminUserApi.list(query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status: UserStatus; reason?: string } }) =>
      adminUserApi.updateStatus(id, payload),
    onSuccess: (_result, variables) => {
      message.success(variables.payload.status === 'banned' ? '账号已封禁' : '账号已解封');
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '操作失败，请稍后重试'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) => adminUserApi.updateRoles(id, { roles }),
    onSuccess: () => {
      message.success('角色已更新');
      setRoleTarget(null);
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '角色更新失败'),
  });

  const profileMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { displayName: string; bio?: string } }) =>
      adminUserApi.updateProfile(id, payload),
    onSuccess: () => {
      message.success('资料已更新');
      setProfileTarget(null);
      void invalidate();
    },
    onError: error => message.error(error instanceof ApiError ? error.message : '资料更新失败'),
  });

  const confirmBan = async () => {
    if (!banTarget) {
      return;
    }
    const nextStatus: UserStatus = banTarget.status === 'banned' ? 'active' : 'banned';
    const reason = banForm.getFieldValue('reason') as string | undefined;
    await statusMutation.mutateAsync({ id: banTarget.id, payload: { status: nextStatus, reason: reason?.trim() } });
    setBanTarget(null);
    banForm.resetFields();
  };

  const columns: TableProps<AdminUserProfile>['columns'] = [
    {
      title: '用户',
      dataIndex: 'displayName',
      render: (_value, record) => (
        <div className="leading-tight">
          <div className="font-medium">{record.displayName}</div>
          <Text type="secondary" className="text-xs">
            {record.email ?? record.phone ?? '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (roles: string[]) => (
        <Space size={[4, 4]} wrap>
          {roles.length === 0 ? <Text type="secondary">-</Text> : roles.map(code => (
            <Tag key={code} color={ROLE_COLORS[code] ?? 'default'}>
              {ROLE_LABELS[code] ?? code}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: UserStatus) => <Tag color={value === 'active' ? 'green' : 'red'}>{STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '最近登录',
      dataIndex: 'lastLoginAt',
      width: 180,
      render: formatDateTime,
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_value, record) => {
        const locked = lockedFor(record);
        return (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => setDetail(record)}>
              详情
            </Button>
            <Button
              type="link"
              size="small"
              disabled={locked || record.id === currentUser?.id}
              onClick={() => {
                setProfileTarget(record);
                profileForm.setFieldsValue({ displayName: record.displayName, bio: record.bio ?? undefined });
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              disabled={locked || record.id === currentUser?.id}
              onClick={() => {
                setRoleTarget(record);
                roleForm.setFieldsValue({ roles: record.roles });
              }}
            >
              角色
            </Button>
            <Button
              type="link"
              size="small"
              danger={record.status === 'active'}
              disabled={locked || record.id === currentUser?.id}
              onClick={() => {
                setBanTarget(record);
                banForm.resetFields();
              }}
            >
              {record.status === 'active' ? '封禁' : '解封'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <SEOHead title="用户管理" description="社区用户的状态、角色与资料管理。" />
      <div className="space-y-4">
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            用户管理
          </Title>
          <Text type="secondary">共 {data?.total ?? 0} 个账号</Text>
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
              placeholder="昵称 / 邮箱 / 手机号"
              prefix={<SearchOutlined />}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="账号状态"
              style={{ width: 140 }}
              value={status}
              onChange={value => {
                setPage(1);
                setStatus(value);
              }}
              options={[
                { value: 'active', label: '正常' },
                { value: 'banned', label: '已封禁' },
              ]}
            />
            <Select
              allowClear
              placeholder="角色"
              style={{ width: 160 }}
              value={role}
              onChange={value => {
                setPage(1);
                setRole(value);
              }}
              options={ROLE_OPTIONS}
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
            <Button
              onClick={() => {
                setKeyword('');
                setSubmittedKeyword('');
                setStatus(undefined);
                setRole(undefined);
                setPage(1);
              }}
            >
              重置
            </Button>
          </Space>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<AdminUserProfile>
            rowKey="id"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={isFetching}
            scroll={{ x: 1100 }}
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

      {/* 详情 */}
      <Drawer title="用户详情" width={480} open={Boolean(detail)} onClose={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="昵称">{detail.displayName}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detail.email ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.phone ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="简介">{detail.bio ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="角色">
              <Space size={[4, 4]} wrap>
                {detail.roles.map(code => (
                  <Tag key={code} color={ROLE_COLORS[code] ?? 'default'}>
                    {ROLE_LABELS[code] ?? code}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detail.status === 'active' ? 'green' : 'red'}>{STATUS_LABELS[detail.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="邮箱已验证">{detail.emailVerified ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="手机已验证">{detail.phoneVerified ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{formatDateTime(detail.createTime)}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{formatDateTime(detail.lastLoginAt)}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(detail.updateTime)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* 封禁 / 解封 */}
      <Modal
        title={banTarget?.status === 'banned' ? '解封账号' : '封禁账号'}
        open={Boolean(banTarget)}
        onCancel={() => setBanTarget(null)}
        onOk={() => void confirmBan()}
        confirmLoading={statusMutation.isPending}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: banTarget?.status === 'active' }}
      >
        <p className="mb-3 text-sm">
          目标账号：<strong>{banTarget?.displayName}</strong>
        </p>
        {banTarget?.status === 'active' ? (
          <Form form={banForm} layout="vertical">
            <Form.Item
              name="reason"
              label="封禁原因"
              rules={[{ required: true, message: '请填写封禁原因' }]}
              extra="原因会写入操作日志，便于事后追溯。"
            >
              <Input.TextArea rows={3} maxLength={200} showCount placeholder="例如：多次发布违规内容" />
            </Form.Item>
          </Form>
        ) : (
          <p className="text-sm text-muted-foreground">解封后该账号可立即登录。</p>
        )}
      </Modal>

      {/* 角色 */}
      <Modal
        title="调整角色"
        open={Boolean(roleTarget)}
        onCancel={() => setRoleTarget(null)}
        onOk={() =>
          roleTarget &&
          void roleMutation.mutateAsync({ id: roleTarget.id, roles: roleForm.getFieldValue('roles') as string[] })
        }
        confirmLoading={roleMutation.isPending}
        okText="保存"
        cancelText="取消"
      >
        <p className="mb-3 text-sm">
          目标账号：<strong>{roleTarget?.displayName}</strong>
        </p>
        {!isSysAdmin && (
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="当前账号不是系统管理员，无法授予或收回运营/系统管理员角色。"
          />
        )}
        <Form form={roleForm} layout="vertical">
          <Form.Item
            name="roles"
            label="角色（全量替换）"
            rules={[{ required: true, message: '请至少保留一个角色' }]}
            extra="保存后该账号原有的全局角色会被此处选择的项完全替换。"
          >
            <Select
              mode="multiple"
              options={ROLE_OPTIONS.filter(option => isSysAdmin || !ADMIN_ROLE_CODES.includes(option.value))}
              placeholder="选择角色"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑资料 */}
      <Modal
        title="编辑用户资料"
        open={Boolean(profileTarget)}
        onCancel={() => setProfileTarget(null)}
        onOk={() =>
          profileTarget &&
          void profileMutation.mutateAsync({
            id: profileTarget.id,
            payload: {
              displayName: profileForm.getFieldValue('displayName') as string,
              bio: (profileForm.getFieldValue('bio') as string | undefined) ?? undefined,
            },
          })
        }
        confirmLoading={profileMutation.isPending}
        okText="保存"
        cancelText="取消"
      >
        <Form form={profileForm} layout="vertical">
          <Form.Item
            name="displayName"
            label="昵称"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, max: 20, message: '昵称长度需在 2-20 字之间' },
            ]}
          >
            <Input maxLength={20} showCount />
          </Form.Item>
          <Form.Item name="bio" label="简介">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
