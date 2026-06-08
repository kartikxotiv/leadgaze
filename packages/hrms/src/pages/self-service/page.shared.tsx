'use client';

import { Badge } from '@kit/ui/badge';

type DetailTileProps = {
  label: string;
  value: string;
};

function getStatusBadgeClassName(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (
    ['resolved', 'closed', 'published', 'available', 'generated'].includes(
      normalizedStatus,
    )
  ) {
    return 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300';
  }

  if (['in_progress', 'urgent'].includes(normalizedStatus)) {
    return 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300';
  }

  if (['open', 'draft'].includes(normalizedStatus)) {
    return 'border-sky-200 bg-sky-500/10 text-sky-700 dark:border-sky-500/40 dark:text-sky-300';
  }

  return 'border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-300';
}

function StatusBadge(props: { label: string }) {
  return (
    <Badge variant="outline" className={getStatusBadgeClassName(props.label)}>
      {props.label}
    </Badge>
  );
}

function InfoTile(props: DetailTileProps) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{props.label}</p>
      <p className="mt-2 text-sm font-medium">{props.value}</p>
    </div>
  );
}

function StatTile(props: DetailTileProps) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{props.label}</p>
      <p className="mt-2 font-semibold">{props.value}</p>
    </div>
  );
}

export { getStatusBadgeClassName, InfoTile, StatTile, StatusBadge };
