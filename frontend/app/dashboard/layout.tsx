import { headers } from 'next/headers';
import { LanguageProvider } from '@/components/app/language-provider';
import { getAppConfig } from '@/lib/utils';

// The dashboard is a read/edit surface over the caller-memory DB — it needs the
// language context (shared localStorage key with the landing page) but not the
// LiveKit voice session, so it wraps children directly instead of going through <App>.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return (
    <LanguageProvider defaultLanguage={appConfig.defaultLanguage}>{children}</LanguageProvider>
  );
}
