'use client';

import { useState } from 'react';
import { Search, Plus, MoreVertical, ChevronsUpDown } from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { PageBody } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { AdminNavbar } from '~/components/admin-navbar';

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState('billing-providers');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <AppShell navbar={<AdminNavbar />}>
      <div className="flex w-full items-center justify-between mb-2 px-2 pt-2">
        <span className="primary-heading-extra text-leadgaze-dark dark:text-white">System Settings</span>
        <Button className="h-[28px] px-3 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-[12px] rounded-[4px] shadow-sm">
          <Plus className="mr-1 h-3.5 w-3.5" /> New Feature
        </Button>
      </div>

      <PageBody className="pb-2 px-2 pt-0 h-[calc(100vh-6rem)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-2 h-full">
          {/* Header block with Tabs list and Search box matching screenshot */}
          <div className="flex items-center justify-between border-top-bottom-gray w-full bg-transparent px-0 overflow-x-auto">
            <TabsList className="h-auto justify-start gap-0 rounded-none bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
              <TabsTrigger
                value="billing-providers"
                className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
              >
                Billing Providers
              </TabsTrigger>
              <TabsTrigger
                value="feature-flags"
                className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
              >
                Feature Flags
              </TabsTrigger>
              <TabsTrigger
                value="webhook-monitoring"
                className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
              >
                Webhook Monitoring
              </TabsTrigger>
            </TabsList>
            
            <ListToolBar
              align="right"
              className="border-none bg-transparent p-0 pb-1"
              showSearch
              expandableSearch
              searchPlaceholder="Search"
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          <TabsContent value="billing-providers" className="m-0 h-full flex flex-col outline-none mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              
              {/* Razorpay Card */}
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-none p-5 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">Razorpay</h3>
                  <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none font-semibold text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Active</Badge>
                </div>
                <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 mb-6">
                  Invoice and payment-link collection; packages and billing stay in Leadgaze
                </p>
                <div className="mt-auto flex">
                  <Button variant="outline" className="h-[34px] px-4 text-[13px] font-bold text-gray-700 border-gray-200 hover:bg-gray-50 rounded-[4px] shadow-sm">
                    Configure
                  </Button>
                </div>
              </div>

              {/* PayPal Card */}
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-none p-5 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">PayPal</h3>
                  <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none font-semibold text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Inactive</Badge>
                </div>
                <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 mb-6">
                  Future payment provider integration
                </p>
                <div className="mt-auto flex">
                  <Button className="h-[34px] px-5 text-[13px] font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-[4px] shadow-none">
                    Connect
                  </Button>
                </div>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="feature-flags" className="m-0 h-full flex flex-col outline-none mt-0">
            <CustomTableContainer
              className="flex-1"
              pagination={
                <TablePagination currentPage={1} totalPages={1} totalCount={7} pageSize={25} />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 pl-4"><Checkbox /></TableHead>
                    <TableHead>S. No.</TableHead>
                    <TableHead>
                      <div className="flex items-center cursor-pointer">Name <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" /></div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center cursor-pointer">Emial <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" /></div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center cursor-pointer">Workspace <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" /></div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center cursor-pointer">Last login <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" /></div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center cursor-pointer">Status <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" /></div>
                    </TableHead>
                    <TableHead className="w-12 pr-4 text-center">
                      <div className="flex justify-center">
                        <div className="h-[22px] w-[22px] bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm cursor-pointer hover:bg-blue-700">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <TableRow key={i} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="pl-4"><Checkbox /></TableCell>
                      <TableCell className="primary-text-regular text-leadgaze-muted">1</TableCell>
                      <TableCell className="primary-text-medium text-leadgaze-dark dark:text-white">Wayne Corp</TableCell>
                      <TableCell className="primary-text-regular text-leadgaze-muted">tony@starkindustries.com</TableCell>
                      <TableCell className="primary-text-regular text-leadgaze-muted">1</TableCell>
                      <TableCell className="primary-text-regular text-leadgaze-muted">2026-08-03 09:12</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none font-semibold text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CustomTableContainer>
          </TabsContent>

          <TabsContent value="webhook-monitoring" className="m-0 h-full flex flex-col outline-none mt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {/* Total Events Card */}
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-none p-5 shadow-sm flex flex-col">
                <h4 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-3">Total Events (24h)</h4>
                <div className="text-[28px] font-bold text-[#2563EB] mb-2 leading-none">4,821</div>
                <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">All providers</p>
              </div>

              {/* Failed Webhooks Card */}
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-none p-5 shadow-sm flex flex-col">
                <h4 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-3">Failed Webhooks</h4>
                <div className="text-[28px] font-bold text-red-500 mb-2 leading-none">14</div>
                <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">Needs attention</p>
              </div>

              {/* Retry Queue Card */}
              <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-none p-5 shadow-sm flex flex-col">
                <h4 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-3">Retry Queue</h4>
                <div className="text-[28px] font-bold text-orange-500 mb-2 leading-none">3</div>
                <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">Pending</p>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </PageBody>
    </AppShell>
  );
}
