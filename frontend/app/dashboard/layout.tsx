import { headers } from 'next/headers';
import { DashboardApp } from '@/components/app/dashboard/dashboard-app';
import { getAppConfig } from '@/lib/utils';

// The dashboard is a routed app shell (sidebar + header) over the real caller-memory
// store and the LiveKit voice session. DashboardApp (client) provides the language
// context, the voice session, and the shell; each route segment renders into it.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  return <DashboardApp appConfig={appConfig}>{children}</DashboardApp>;
}
