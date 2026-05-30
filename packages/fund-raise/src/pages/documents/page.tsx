'use client';

import React from 'react';
import {
  FileText,
  Plus,
  Download,
  Eye,
  FileSpreadsheet,
  Globe,
  Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'Leadgaze Pitch Deck V2.pdf',
    size: '4.2 MB',
    type: 'Pitch Deck',
    lastUpdated: 'May 28, 2026',
    sharedCount: 14,
    accessLevel: 'public_link'
  },
  {
    id: 'doc-2',
    name: 'Financial Model Projections 5Y.xlsx',
    size: '1.8 MB',
    type: 'Financials',
    lastUpdated: 'May 25, 2026',
    sharedCount: 3,
    accessLevel: 'restricted'
  },
  {
    id: 'doc-3',
    name: 'Series A Term Sheet Template.docx',
    size: '520 KB',
    type: 'Legal',
    lastUpdated: 'May 30, 2026',
    sharedCount: 1,
    accessLevel: 'restricted'
  }
];

export function FundraisingDocumentsPage() {
  return (
    <div className="flex h-full w-full flex-col space-y-6 p-6">
      <div className="flex flex-col justify-between space-y-2 sm:flex-row sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Room & Documents</h1>
          <p className="text-muted-foreground">Upload, share, and track access metrics for Pitch Decks, Financial Models, and Legal agreements.</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mockDocuments.map((doc) => (
          <Card key={doc.id} className="hover:shadow-sm transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  {doc.name.endsWith('.xlsx') ? (
                    <FileSpreadsheet className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </div>
                <Badge variant={doc.accessLevel === 'public_link' ? 'default' : 'outline'} className="flex items-center space-x-1">
                  {doc.accessLevel === 'public_link' ? (
                    <>
                      <Globe className="h-3 w-3 mr-0.5" /> <span>Public link</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 mr-0.5" /> <span>Restricted</span>
                    </>
                  )}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold mt-4 truncate" title={doc.name}>
                {doc.name}
              </CardTitle>
              <CardDescription className="text-xs">{doc.type} • {doc.size}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                <span className="text-muted-foreground">Shared: {doc.sharedCount} times</span>
                <span className="text-muted-foreground">Updated {doc.lastUpdated}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
                <Button size="sm" className="h-8">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Track Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
