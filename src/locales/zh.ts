/**
 * 全站中文文案。
 *
 * 首期只做中文（计划 §十三.4），所以不做 LanguageContext 那套运行时字典切换 ——
 * 单语言下引入 context 只会增加一层无收益的间接。这里集中放**多处复用**的文案；
 * 只在单个页面出现的文案直接写在页面里，避免字典变成杂物间。
 * 日后要加英文时，把这个对象改造成 `Record<key, { zh, en }>` 再引入 context 即可。
 */

export const zh = {
  site: {
    name: 'TileLang for RISC-V 社区',
    shortName: 'TileLang AI 社区',
    slogan: '开放协作，共建 TileLang for RISC-V 的开源生态',
    /** 官网首页，用于页脚与「返回官网」入口 */
    portalUrl: 'https://www.tlaic.ac.cn',
    portalName: '北京通明湖信息技术应用创新中心',
  },

  nav: {
    home: '首页',
    news: '社区资讯',
    resources: '资源中心',
    courses: '学习中心',
    about: '关于社区',
    login: '登录',
    register: '注册',
    logout: '退出登录',
    profile: '个人中心',
    admin: '管理后台',
    search: '全站搜索',
    notifications: '消息中心',
    guidelines: '社区公约',
    contact: '联系方式',
  },

  auth: {
    loginTitle: '登录社区',
    registerTitle: '加入社区',
    forgotTitle: '找回密码',
    email: '邮箱',
    phone: '手机号',
    password: '密码',
    confirmPassword: '确认密码',
    displayName: '昵称',
    code: '验证码',
    sendCode: '获取验证码',
    resendIn: (seconds: number) => `${seconds} 秒后重发`,
    account: '邮箱或手机号',
    accountPlaceholder: '请输入注册时使用的邮箱或手机号',
    login: '登录',
    register: '注册',
    forgot: '忘记密码？',
    noAccount: '还没有账号？',
    hasAccount: '已有账号？',
    goRegister: '立即注册',
    goLogin: '去登录',
    resetSubmit: '重置密码',
    agreePrefix: '我已阅读并同意',
    userAgreement: '《用户协议》',
    privacyPolicy: '《隐私政策》',
    and: '和',
    agreeRequired: '请先阅读并同意用户协议与隐私政策',
    byChannelEmail: '邮箱',
    byChannelPhone: '手机号',
  },

  /**
   * 认证页左侧品牌面板文案。
   *
   * 三个页面各一组而不是共用一套：注册页要回答「加入后能做什么」，
   * 登录页是「欢迎回来」，找回密码页则在陈述一个动作 —— 用同一套措辞
   * 会让三个页面看起来像同一个页面。
   */
  authPanel: {
    register: {
      title: '加入 TileLang for RISC-V 社区',
      subtitle: '开放协作，共建 TileLang for RISC-V 的开源生态',
      bullets: [
        '获取 RISC-V 指令集与 AI 扩展的技术资讯',
        '下载工具链、算子库、开发板固件与示例工程',
        '按学习路径系统入门，从指令集到芯片落地',
        '与同行交流问题，共同推进开源生态建设',
      ],
    },
    login: {
      title: '欢迎回来',
      subtitle: '登录后可下载资源、参与讨论并接收社区动态',
      bullets: ['继续未完成的学习路径', '管理收藏、关注与下载记录', '接收社区动态与订阅推送'],
    },
    forgot: {
      title: '找回账号访问',
      subtitle: '通过注册时使用的邮箱或手机号验证后，即可设置新密码',
      bullets: [],
    },
  },

  common: {
    loading: '正在加载...',
    submit: '提交',
    cancel: '取消',
    save: '保存',
    back: '返回',
    retry: '重试',
    empty: '暂无数据',
    errorTitle: '出错了',
    comingSoon: '该功能正在建设中，敬请期待',
    notFoundTitle: '页面不存在',
    notFoundDesc: '您访问的页面可能已被移动或删除。',
    backHome: '返回首页',
    logoutConfirm: '确定要退出登录吗？',
  },

  footer: {
    contact: '联系我们',
    links: '相关链接',
    followUs: '关注社区',
    rights: '版权所有',
  },
} as const;

export type SiteText = typeof zh;
