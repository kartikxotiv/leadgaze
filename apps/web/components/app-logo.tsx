import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({
  className,
  width = 105,
  collapsed = false,
}: {
  className?: string;
  width?: number;
  collapsed?: boolean;
}) {
  if (collapsed) {
    return (
      <Image
        src={'/images/favicon/apple-touch-icon.png'}
        height={24}
        width={24}
        alt="leadgaze"
        className={cn('mx-auto rounded-md', className)}
      />
    );
  }

  return (
    <Image
      src={'/images/leadgaze.png'}
      height={150}
      width={200}
      alt="leadgaze"
      className={className}
    />
  );
}

export function AppLogo({
  href,
  label,
  className,
  collapsed,
}: {
  href?: string | null;
  className?: string;
  label?: string;
  collapsed?: boolean;
}) {
  if (href === null) {
    return <LogoImage className={className} collapsed={collapsed} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'}>
      <LogoImage className={className} collapsed={collapsed} />
    </Link>
  );
}
