'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ArrowLeft,
  MoreVertical, 
  Plus, 
  GripVertical, 
  Trash2,
  CheckCircle2,
  HeartHandshake,
  Rocket,
  TrendingUp,
  ChevronsUpDown
} from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { Input } from '@kit/ui/input';
import { PageBody } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@kit/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@kit/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Label } from '@kit/ui/label';

import { AdminNavbar } from '~/components/admin-navbar';

// Mock Features Data
const FEATURES_DATA = [
  { id: 1, sNo: 1, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 2, sNo: 2, feature: 'Email Sequences', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 3, sNo: 3, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 4, sNo: 4, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 5, sNo: 5, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 6, sNo: 6, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
  { id: 7, sNo: 7, feature: 'Lead Management', desc: 'Create, assign, and track leads through pipeline stages', date: '2026-08-01' },
];

export default function ModuleDetailsPage() {
  const router = useRouter();
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  return (
    <AppShell navbar={<AdminNavbar />}>
      {/* Header Segment */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between px-2 pt-2 mb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild className="h-6 w-6 border border-leadgaze-border p-0 cursor-pointer text-gray-500 hover:text-gray-900 bg-gray-50">
            <Link href="/modules"><ArrowLeft className="h-3 w-3" /></Link>
          </Button>
          {/* Avatar */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white bg-blue-600">
            S
          </div>
          {/* Name + badges + owner */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="primary-heading-extra text-leadgaze-dark dark:text-white">Sales Desk</span>
              <Badge className="bg-blue-600 text-white border-none font-semibold text-[10px] px-1.5 py-0 rounded shadow-none h-4">v3.4.2</Badge>
            </div>
            <p className="secondary-text-small text-leadgaze-muted">
              Customer relationship management · Released 2024-01-15
            </p>
          </div>
        </div>
      </div>

      <PageBody className="pb-2 px-2 pt-0 h-[calc(100vh-6rem)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-2 h-full">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-top-bottom-gray bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
            <TabsTrigger
              value="features"
              className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
            >
              Features
            </TabsTrigger>
            <TabsTrigger
              value="pricing"
              className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
            >
              Pricing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="m-0 h-full flex flex-col outline-none mt-0 pt-0">
            <CustomTableContainer
              className="flex-1"
              pagination={
                <TablePagination currentPage={1} totalPages={1} totalCount={FEATURES_DATA.length} pageSize={25} />
              }
            >
                  <Table>
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-900/50">
                      <TableRow className="border-gray-200 hover:bg-transparent">
                        <TableHead className="w-12 text-center h-10"><Checkbox className="border-gray-300 rounded-[3px]" /></TableHead>
                        <TableHead className="w-16 font-semibold text-gray-700 h-10 text-[12px]">S. No.</TableHead>
                        <TableHead className="font-semibold text-gray-700 h-10 text-[12px]">
                          <div className="flex items-center cursor-pointer">
                            Features <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 h-10 text-[12px]">
                          <div className="flex items-center cursor-pointer">
                            Description <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 h-10 text-[12px]">
                          <div className="flex items-center cursor-pointer">
                            Available On <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 h-10 text-[12px] w-[140px]">
                          <div className="flex items-center cursor-pointer">
                            Status <ChevronsUpDown className="ml-1.5 h-3 w-3 text-gray-400" />
                          </div>
                        </TableHead>
                        <TableHead className="w-12 text-center h-10">
                          <div className="flex justify-center">
                            <div className="h-[22px] w-[22px] bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FEATURES_DATA.map((row) => (
                        <TableRow key={row.id} className="border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="text-center py-2"><Checkbox className="border-gray-300 rounded-[3px]" /></TableCell>
                          <TableCell className="text-[13px] text-gray-500 font-medium py-2">{row.sNo}</TableCell>
                          <TableCell className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 py-2">{row.feature}</TableCell>
                          <TableCell className="text-[13px] text-gray-500 py-2">{row.desc}</TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-200 border-none font-medium text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Starter</Badge>
                              <Badge className="bg-blue-50 text-blue-500 hover:bg-blue-100 border-none font-medium text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Growth</Badge>
                              <Badge className="bg-purple-50 text-purple-500 hover:bg-purple-100 border-none font-medium text-[10px] px-2.5 py-0.5 rounded-[12px] shadow-none">Enterprise</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] text-gray-700 font-semibold py-2">{row.date}</TableCell>
                          <TableCell className="text-center py-2">
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

          <TabsContent value="pricing" className="m-0 h-full overflow-auto p-2 pt-4 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {/* Free Forever */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 rounded-[4px] shadow-sm flex flex-col">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-[42px] w-[42px] bg-gray-100 dark:bg-gray-800 rounded-[4px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <HeartHandshake className="h-[22px] w-[22px]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[17px] text-gray-900 leading-tight">Free Forever</h3>
                        <div className="flex items-center mt-1">
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 font-semibold text-[10px] px-1.5 py-[1px] rounded-[4px] shadow-none flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-6">
                      <span className="text-[28px] font-bold text-gray-900">$0</span>
                      <span className="text-[13px] text-gray-400 font-semibold">/ mo</span>
                    </div>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">Free for small teams</p>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">KEY FEATURES</h4>
                    <div className="flex flex-col gap-3.5 mb-8">
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 1 User
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 250 Records Limit
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Basic Management
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 5 Custom Fields
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Manual Meetings
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Button onClick={() => setIsEditPlanOpen(true)} variant="outline" className="w-full text-[#2563EB] border-gray-200 hover:bg-gray-50 font-semibold text-[13px] rounded-[4px] h-[38px]">
                        Edit Plan
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Launch */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 rounded-[4px] shadow-sm flex flex-col">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-[42px] w-[42px] bg-gray-100 dark:bg-gray-800 rounded-[4px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <Rocket className="h-[22px] w-[22px]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[17px] text-gray-900 leading-tight">Launch</h3>
                        <div className="flex items-center mt-1">
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 font-semibold text-[10px] px-1.5 py-[1px] rounded-[4px] shadow-none flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-6">
                      <span className="text-[28px] font-bold text-gray-900">$19</span>
                      <span className="text-[13px] text-gray-400 font-semibold">/ user / mo</span>
                    </div>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">Billed annually</p>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">KEY FEATURES</h4>
                    <div className="flex flex-col gap-3.5 mb-8">
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 1,000 Records Limit
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Import / Export
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Email Integration (2)
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 20 Custom Fields
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Role Customization
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Button onClick={() => setIsEditPlanOpen(true)} variant="outline" className="w-full text-[#2563EB] border-gray-200 hover:bg-gray-50 font-semibold text-[13px] rounded-[4px] h-[38px]">
                        Edit Plan
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Growth */}
                <div className="bg-white dark:bg-gray-950 border border-gray-200 rounded-[4px] shadow-sm flex flex-col">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-[42px] w-[42px] bg-gray-100 dark:bg-gray-800 rounded-[4px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <TrendingUp className="h-[22px] w-[22px]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[17px] text-gray-900 leading-tight">Growth</h3>
                        <div className="flex items-center mt-1">
                          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 font-semibold text-[10px] px-1.5 py-[1px] rounded-[4px] shadow-none flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-6">
                      <span className="text-[28px] font-bold text-gray-900">$49</span>
                      <span className="text-[13px] text-gray-400 font-semibold">/ user / mo</span>
                    </div>
                    <p className="text-[13px] text-gray-400 font-medium mt-1">Billed annually</p>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">KEY FEATURES</h4>
                    <div className="flex flex-col gap-3.5 mb-8">
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 5,000 Records Limit
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Includes Launch +
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Zoom/Meet/Meta
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> Advanced Reports
                      </div>
                      <div className="flex items-center text-[13px] font-medium text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" /> 100 Custom Fields
                      </div>
                    </div>
                    <div className="mt-auto">
                      <Button onClick={() => setIsEditPlanOpen(true)} variant="outline" className="w-full text-[#2563EB] border-gray-200 hover:bg-gray-50 font-semibold text-[13px] rounded-[4px] h-[38px]">
                        Edit Plan
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
        </Tabs>

        {/* Edit Sales Plan Sheet */}
        <Sheet open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
          <SheetContent side="right" className="w-[450px] sm:max-w-[450px] p-0 flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
            <SheetHeader className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-row items-center justify-between shadow-sm z-10 shrink-0">
              <SheetTitle className="text-[17px] font-bold text-gray-900 m-0 p-0">Edit Sales Plan</SheetTitle>
            </SheetHeader>
            <div className="px-6 py-5 flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar bg-gray-50/30">
              
              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-gray-600">Plan Name</Label>
                <Select defaultValue="Growth">
                  <SelectTrigger className="h-[40px] text-[13px] bg-white border-gray-200 rounded-[4px] focus:ring-1 focus:ring-blue-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Launch">Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-gray-600">Monthly Price</Label>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox id="monthly-active" defaultChecked className="h-3.5 w-3.5 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white rounded-[2px]" />
                      <label htmlFor="monthly-active" className="text-[10px] font-bold text-gray-600 tracking-wider cursor-pointer mt-0.5">ACTIVE</label>
                    </div>
                  </div>
                  <Input defaultValue="$99.00" className="h-[40px] text-[13px] font-medium bg-white border-gray-200 rounded-[4px]" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-gray-600">Annual Price</Label>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox id="annual-active" defaultChecked className="h-3.5 w-3.5 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white rounded-[2px]" />
                      <label htmlFor="annual-active" className="text-[10px] font-bold text-gray-600 tracking-wider cursor-pointer mt-0.5">ACTIVE</label>
                    </div>
                  </div>
                  <Input defaultValue="$990.00" className="h-[40px] text-[13px] font-medium bg-white border-gray-200 rounded-[4px]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-gray-600">Plan Status</Label>
                <Select defaultValue="Active">
                  <SelectTrigger className="h-[40px] text-[13px] bg-white border-gray-200 rounded-[4px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2.5 mt-1 bg-white p-3 border border-gray-100 rounded-[4px] shadow-sm">
                <Checkbox id="recommended" defaultChecked className="h-4 w-4 border-blue-600 data-[state=checked]:bg-blue-600 rounded-[3px]" />
                <label htmlFor="recommended" className="text-[13px] text-gray-800 font-medium cursor-pointer flex-1">
                  Mark as 'Recommended Plan'
                </label>
              </div>

              <div className="space-y-3 mt-2">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Features Included</h4>
                <div className="flex flex-col gap-2.5">
                  {/* Feature Row */}
                  <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-[4px] p-2 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="cursor-grab text-gray-300 hover:text-gray-500">
                      <GripVertical className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 text-[13px] text-gray-700 font-medium">
                      Email Integration (Gmail/Outlook)
                    </div>
                    <Input defaultValue="500" className="h-[32px] w-[60px] text-center text-[13px] font-medium px-2 rounded-[4px] border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500" />
                    <Button variant="ghost" size="icon" className="h-[32px] w-[32px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-[4px]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Feature Row */}
                  <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-[4px] p-2 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="cursor-grab text-gray-300 hover:text-gray-500">
                      <GripVertical className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 text-[13px] text-gray-700 font-medium">
                      Sales Pipeline Automation
                    </div>
                    <Input defaultValue="250" className="h-[32px] w-[60px] text-center text-[13px] font-medium px-2 rounded-[4px] border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500" />
                    <Button variant="ghost" size="icon" className="h-[32px] w-[32px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-[4px]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Feature Row */}
                  <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-[4px] p-2 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="cursor-grab text-gray-300 hover:text-gray-500">
                      <GripVertical className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 text-[13px] text-gray-700 font-medium">
                      Advanced Lead Scoring
                    </div>
                    <Input defaultValue="300" className="h-[32px] w-[60px] text-center text-[13px] font-medium px-2 rounded-[4px] border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500" />
                    <Button variant="ghost" size="icon" className="h-[32px] w-[32px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-[4px]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Add New Feature */}
                  <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-200 border-dashed rounded-[4px] p-2 cursor-pointer hover:bg-gray-100 transition-colors shadow-sm">
                    <div className="pl-1 text-gray-400">
                      <Plus className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 text-[13px] text-gray-400 font-medium italic ml-1">
                      Add new feature...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-row items-center justify-end gap-3 sm:space-x-0 bg-white shadow-md z-10 shrink-0">
              <Button variant="ghost" className="h-9 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 px-4" onClick={() => setIsEditPlanOpen(false)}>
                Cancel
              </Button>
              <Button className="h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-[13px] rounded-[4px] shadow-sm px-6" onClick={() => setIsEditPlanOpen(false)}>
                Save Changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </PageBody>
    </AppShell>
  );
}
