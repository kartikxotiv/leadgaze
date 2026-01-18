import React from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCompany } from '@/hooks/use-companies';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
interface CompanyDetailPageProps {
  params: {
    id: string;
  };
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { data: company, isLoading } = useCompany(params.id);
    return (
    <DashboardLayout>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Company not found</h3>
          <p className="text-muted-foreground mb-4">
            The company you're looking for doesn't exist.
          </p>
        </div>
      )}
      {company && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{company.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{company.description}</p>
              <p>{company.location}</p>
              <p>{company.industry}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
            <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{company.contacts?.map((contact: any) => contact.firstName).join(', ')}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}