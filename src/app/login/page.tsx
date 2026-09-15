import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { LoginView } from '@/components/auth/LoginView';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return <LoginView />;
}
