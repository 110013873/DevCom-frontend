import LegalPage from './LegalPage';
import { zh } from '@/locales/zh';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      type="privacy_policy"
      title={zh.auth.privacyPolicy.replace(/[《》]/g, '')}
      description="本政策说明我们收集哪些信息、如何使用，以及您可以如何管理这些信息。"
    />
  );
}
