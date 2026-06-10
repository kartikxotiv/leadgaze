import { ShieldAlert } from 'lucide-react';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';

export function ReportsAccessCard() {
  return (
    <CardWidgetContainer
      title="Reports access is restricted"
      desc="Ask an administrator to grant reports permissions for your role."
      contentClassName="hidden"
      icon2={<ShieldAlert className="text-leadgaze-muted h-5 w-5" />}
    >
      <div />
    </CardWidgetContainer>
  );
}
