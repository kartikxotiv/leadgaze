import { PageHeader, PageBody } from '@kit/ui/page';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

export default function RolesPage() {
  return (
    <>
      <PageHeader title="Roles" description="Manage workspace roles and permissions" />
      <PageBody>
        <Card>
          <CardContent className="pt-6">
            <Heading level={4}>Roles & Permissions Management</Heading>
            <p className="text-slate-600 mt-2">
              This is a placeholder for the roles and permissions management screen.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
