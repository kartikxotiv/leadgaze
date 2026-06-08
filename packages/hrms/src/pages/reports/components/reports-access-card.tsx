import { Card, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

export function ReportsAccessCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports access is restricted</CardTitle>
        <CardDescription>
          Ask an administrator to grant reports permissions for your role.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
