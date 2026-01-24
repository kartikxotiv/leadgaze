import { PageHeader, PageBody } from '@kit/ui/page';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title="Opportunities" description="Manage your sales opportunities" />
      <PageBody>
        <Card>
          <CardContent className="pt-6">
            <Heading level={4}>Opportunities Management</Heading>
            <p className="text-slate-600 mt-2">
              This is a placeholder for the opportunities management screen.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
