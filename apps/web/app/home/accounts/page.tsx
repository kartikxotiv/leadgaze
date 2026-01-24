import { PageHeader, PageBody } from '@kit/ui/page';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Accounts" description="Manage business accounts" />
      <PageBody>
        <Card>
          <CardContent className="pt-6">
            <Heading level={4}>Accounts Management</Heading>
            <p className="text-slate-600 mt-2">
              This is a placeholder for the accounts management screen.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
