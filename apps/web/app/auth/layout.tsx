import { AuthLayoutShell } from '@kit/auth/shared';

function AuthLayout({ children }: React.PropsWithChildren) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}

export default AuthLayout;
