import { AuthLayoutShell } from '@kit/auth/shared';
import { Footer } from '~/_components/footer';

function AuthLayout({ children }: React.PropsWithChildren) {
  return (
    <>
      <AuthLayoutShell>{children}</AuthLayoutShell>
      <Footer />
    </>
  );
}

export default AuthLayout;
