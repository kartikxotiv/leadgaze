'use client';

import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
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
    <div className="flex flex-col h-full flex-1 min-h-0 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-3 border-b border-slate-200 bg-white shrink-0">
        <h3 className="mb-0 flex items-center gap-2 primary-text-medium text-leadgaze-dark dark:text-white">
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
          <Table className="border-none">
            <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                <TableHead className="font-semibold text-slate-700 h-10">Date</TableHead>
                <TableHead className="font-semibold text-slate-700 h-10">ID</TableHead>
                <TableHead className="font-semibold text-slate-700 h-10">Payment Method</TableHead>
                <TableHead className="font-semibold text-slate-700 h-10">Amount</TableHead>
                <TableHead className="font-semibold text-slate-700 h-10">Status</TableHead>
                <TableHead className="text-center font-semibold text-slate-700 h-10">Receipt</TableHead>
                <TableHead className="text-center font-semibold text-slate-700 h-10">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((invoice, index) => (
                <TableRow key={index} className="border-b border-slate-200">
                  <TableCell className="py-2.5">{invoice.date}</TableCell>
                  <TableCell className="py-2.5 text-blue-500 font-medium">{invoice.id}</TableCell>
                  <TableCell className="py-2.5">{invoice.paymentMethod}</TableCell>
                  <TableCell className="py-2.5">{invoice.amount}</TableCell>
                  <TableCell className="py-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${invoice.status === 'Success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <button className="text-blue-500 hover:text-blue-700 transition-colors">
                      <Download className="h-4 w-4 mx-auto" />
                    </button>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <button className="text-blue-500 hover:text-blue-700 transition-colors">
                      <Download className="h-4 w-4 mx-auto" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CustomTableContainer>
      </div>
    </div>
  );
}
