'use client';

import { useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

// Define a type for invoices
type Invoice = {
  id: string;
  date: string;
  paymentMethod: string;
  amount: string;
  status: string;
  receiptUrl: string;
  invoiceUrl: string;
};

export function WorkspaceInvoiceSettings() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(false); // Can be toggled when hooked up to API

  // Placeholder data to match screenshot
  const data: Invoice[] = [
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Declined', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
  ];

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 border border-slate-200 overflow-hidden bg-white">
      <div className="p-2 border-b border-slate-200 bg-white shrink-0">
        <h3 className="mb-0 flex items-center gap-2 primary-text-big-regular text-leadgaze-dark dark:text-white">
          <FileText className="h-4 w-4" />
          Invoice History
        </h3>
      </div>
      <div className="flex flex-col flex-1 min-h-0 p-0 bg-white">
        <CustomTableContainer
          className="!space-y-0 h-full flex-1"
          containerClass="rounded-none border-0"
          pagination={
            totalCount > 0 ? (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                entityLabel="invoices"
              />
            ) : undefined
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((invoice, index) => (
                  <TableRow key={index}>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell className="text-leadgaze-primary font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.paymentMethod}</TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${invoice.status === 'Success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button className="text-leadgaze-primary transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="text-leadgaze-primary transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button className="text-leadgaze-primary transition-colors">
                        <Download className="h-4 w-4 mx-auto" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CustomTableContainer>
      </div>
    </div>
  );
}
