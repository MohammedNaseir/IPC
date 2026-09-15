import { requirePageUser } from '@/server/auth/session';
import { listNotifications } from '@/server/queries/system';
import { PortalShell } from '@/components/shell/PortalShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const notifications = await listNotifications(user);

  return (
    <PortalShell user={user} notifications={notifications}>
      {children}
    </PortalShell>
  );
}
