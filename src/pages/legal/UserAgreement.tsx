import LegalPage from './LegalPage';
import { zh } from '@/locales/zh';

export default function UserAgreement() {
  return (
    <LegalPage
      type="user_agreement"
      title={zh.auth.userAgreement.replace(/[《》]/g, '')}
      description="使用本社区服务前，请阅读并理解以下条款。"
    />
  );
}
