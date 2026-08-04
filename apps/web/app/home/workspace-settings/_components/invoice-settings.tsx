'use client';

import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { Skeleton } from '@kit/ui/skeleton';
import { ColumnDef } from '@tanstack/react-table';

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

// Define columns for the DataTable
const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="text-blue-500">{row.original.id}</span>
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Payment Method',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {status}
        </span>
      );
    }
  },
  {
    id: 'receipt',
    header: 'Receipt',
    cell: () => <span className="text-blue-500 cursor-pointer text-xl">⬇</span>
  },
  {
    id: 'invoice',
    header: 'Invoice',
    cell: () => <span className="text-blue-500 cursor-pointer text-xl">⬇</span>
  }
];

export function WorkspaceInvoiceSettings() {
  // Placeholder data to match screenshot
  const data: Invoice[] = [
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Declined', receiptUrl: '#', invoiceUrl: '#' },
    { id: '#1RT654789', date: '2026-07-13', paymentMethod: 'MasterCard ending in 3213', amount: '$254.45', status: 'Success', receiptUrl: '#', invoiceUrl: '#' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Invoice History
          </CardTitle>
          <CardDescription>
            View and download your past invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data}
            pageCount={1}
            pageSize={15}
          />
        </CardContent>
      </Card>
    </div>
  );
}
