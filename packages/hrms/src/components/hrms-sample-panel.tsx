import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

export function HrmsSamplePanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription>HRMS module sample</CardDescription>
              <CardTitle className="text-2xl">Employee lifecycle overview</CardTitle>
            </div>
            <Badge variant="outline">Preview</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            This is a minimal HRMS surface inside Leadgaze. It is only a sample shell for the internal package integration.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Metric label="Employees" value="248" hint="Active workforce in the HRMS module" />
          <Metric label="Open Requests" value="14" hint="Leave, attendance, and support items" />
          <Metric label="Departments" value="12" hint="Teams aligned to role structure" />
          <Metric label="Today Attendance" value="91%" hint="Employees already checked in" />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-2">
          <CardDescription>First screen sample</CardDescription>
          <CardTitle className="text-xl">HRMS dashboard tile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">What this proves</p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              A module switch can route the Leadgaze shell into HRMS content without changing the rest of the app.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Employees
            </Button>
            <Button variant="outline" size="sm">
              Attendance
            </Button>
            <Button variant="outline" size="sm">
              Leave
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric(props: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{props.label}</p>
      <p className="mt-2 text-2xl font-semibold">{props.value}</p>
      <p className="primary-text-regular text-muted-foreground mt-1">{props.hint}</p>
    </div>
  );
}
