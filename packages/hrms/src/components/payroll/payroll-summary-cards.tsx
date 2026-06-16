import { Banknote, ClipboardList, Receipt, Users } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

export function PayrollSummaryCards(props: {
  items: Array<{ label: string; value: string; hint: string }>;
}) {
  const icons = [Banknote, Users, ClipboardList, Receipt];
  const iconColors = [
    'bg-primary',
    'bg-activity-5',
    'bg-activity-4',
    'bg-activity-3',
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item, index) => {
        const Icon = icons[index % icons.length] ?? Receipt;

        return (
          <Card
            key={item.label}
            className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
              <div className="space-y-1">
                <CardDescription className="secondary-text-small text-leadgaze-muted dark:text-white">
                  {item.label}
                </CardDescription>
                <CardTitle className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                  {item.value}
                </CardTitle>
              </div>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded ${iconColors[index % iconColors.length]}`}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <p className="secondary-text-small text-leadgaze-success">
                {item.hint}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
