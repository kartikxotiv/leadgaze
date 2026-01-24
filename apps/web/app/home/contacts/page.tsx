import { PageHeader, PageBody } from '@kit/ui/page';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

export default function ContactsPage() {
  return (
    <>
      <PageHeader title="Contacts" description="Manage your business contacts" />
      <PageBody>
        <Card>
          <CardContent className="pt-6">
            <Heading level={4}>Contacts Management</Heading>
            <p className="text-slate-600 mt-2">
              This is a placeholder for the contacts management screen.
            </p>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
