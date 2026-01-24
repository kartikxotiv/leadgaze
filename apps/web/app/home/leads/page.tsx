import { PageHeader, PageBody } from '@kit/ui/page';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

export default function LeadsPage() {
  return (
    <>
      <PageHeader title="Leads" description="Manage your sales leads" />
      <PageBody>
        <Card>
          <CardContent className="pt-6">
            <Heading level={4}>Leads Management</Heading>
            <p className="text-slate-600 mt-2">
              This is a placeholder for the leads management screen.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
