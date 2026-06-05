import { Badge } from '@kit/ui/badge';

export function PayrollStatusBadge(props: { label: string }) {
  const label = props.label.toLowerCase();
  const className =
    label === 'ready' ||
    label === 'validated' ||
    label === 'live' ||
    label === 'active' ||
    label === 'approved' ||
    label === 'paid' ||
    label === 'published'
      ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
      : label.includes('review') ||
          label.includes('needs') ||
          label === 'draft' ||
          label === 'generated'
        ? 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300'
        : label === 'cancelled' || label === 'void' || label === 'closed'
          ? 'border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:text-rose-300'
          : 'border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-300';

  return (
    <Badge variant="outline" className={className}>
      {props.label}
    </Badge>
  );
}
