'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SquarePen, CheckCircle2, Check, Trash2, Plus, GripVertical, LayoutGrid, Headset } from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@kit/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Label } from '@kit/ui/label';
import { Input } from '@kit/ui/input';
import { Checkbox } from '@kit/ui/checkbox';
import { Switch } from '@kit/ui/switch';
import { ListToolBar } from '@kit/ui/list-toolbar';

import { AdminNavbar } from '~/components/admin-navbar';

export default function ModulesPage() {
  const [isBundleSheetOpen, setIsBundleSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  return (
    <AppShell navbar={<AdminNavbar />}>
      {/* Direct content no wrapper needed, matched to leads/org page pattern */}
      <div className="flex flex-col gap-0.5 mb-2 px-2 pt-2">
        <span className="primary-heading-extra text-leadgaze-dark dark:text-white">Modules & Bundles</span>
      </div>
      
      <PageBody className="pb-2 px-2 pt-0">
        <Tabs defaultValue="modules" className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-top-bottom-gray w-full bg-transparent px-0 overflow-x-auto">
            <TabsList className="h-auto justify-start gap-0 rounded-none bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0">
              <TabsTrigger
                value="modules"
                className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
              >
                Modules{' '}
                <span className="ml-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border text-xs font-normal">
                  2
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="bundles"
                className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none secondary-text-small-bold text-leadgaze-muted data-[state=active]:text-leadgaze-primary"
              >
                Bundles{' '}
                <span className="ml-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border text-xs font-normal">
                  3
                </span>
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

          <TabsContent value="modules" className="mt-0 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {/* Sales Workspace Card */}
              <div className="flex flex-col bg-white dark:bg-gray-900 rounded-none border shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="bg-[#2563EB] text-white pt-5">
                  <div className="px-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-[17px] font-bold">Sales Workspace</h3>
                      <p className="text-[13px] text-blue-100/90 mt-1 font-medium">Sales CRM — leads, contacts, deals & pipeline</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-semibold text-[11px] px-2 py-0.5 rounded shadow-none">
                        +12% MoM
                      </Badge>
                      <span className="text-[11px] text-blue-100/80 font-semibold tracking-wide">v3.4.2</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[1px] mt-5">
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">142</div>
                      <div className="text-[11px] text-blue-100/90 font-medium mt-0.5">Workspaces</div>
                    </div>
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">1,847</div>
                      <div className="text-[11px] text-blue-100/90 font-medium mt-0.5">Seats</div>
                    </div>
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">$38,400</div>
                      <div className="text-[11px] text-blue-100/90 font-medium mt-0.5">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col flex-1">
                  {/* Pricing Tiers */}
                  <div className="p-6 pb-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[11px] font-bold text-gray-400 tracking-widest">PRICING TIERS</h4>
                      <Link href="#" className="flex items-center text-[12px] font-medium text-blue-500 hover:text-blue-600 transition-colors">
                        <SquarePen className="h-[14px] w-[14px] mr-1" /> Edit Plans
                      </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-blue-500 leading-none">$0</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">FREE</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-blue-500 leading-none">$19</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">LAUNCH</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1 bg-gray-50/50 dark:bg-gray-800/20">
                        <span className="text-[22px] font-bold text-blue-500 leading-none">$49</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">GROWTH</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-blue-500 leading-none">$99</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">SCALE</span>
                      </div>
                    </div>
                  </div>

                  {/* By Plan */}
                  <div className="px-6 pb-6 border-b border-gray-50 dark:border-gray-800">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">BY PLAN</h4>
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Free</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '10%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">6</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Scale</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '80%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">28</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Growth</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '80%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">28</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Launch</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '40%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">14</span>
                      </div>
                    </div>
                  </div>

                  {/* In Bundles */}
                  <div className="p-6 pb-6">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-3">IN BUNDLES</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Launch Bundle</Badge>
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Growth Bundle</Badge>
                      <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100/50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Scale Bundle</Badge>
                    </div>
                  </div>

                  <div className="mt-auto px-6 pb-6">
                    <div className="flex bg-gray-50/80 dark:bg-gray-800/50 p-[3px] rounded-md border border-gray-100 dark:border-gray-800">
                      <Link href="/modules/sales-desk" className="flex-1 text-center py-1.5 text-[13px] font-semibold bg-[#2563EB] text-white rounded-[4px] shadow-sm">
                        Features
                      </Link>
                      <Link href="/modules/sales-desk" className="flex-1 text-center py-1.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-[4px] transition-colors">
                        Pricing
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Workspace Card */}
              <div className="flex flex-col bg-white dark:bg-gray-900 rounded-none border shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="bg-[#00B4D8] text-white pt-5">
                  <div className="px-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-[17px] font-bold">Service Workspace</h3>
                      <p className="text-[13px] text-cyan-100/90 mt-1 font-medium">Support desk — tickets, SLA, shared inbox & agents</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-semibold text-[11px] px-2 py-0.5 rounded shadow-none">
                        +8% MoM
                      </Badge>
                      <span className="text-[11px] text-cyan-100/80 font-semibold tracking-wide">v2.1.0</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[1px] mt-5">
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">48</div>
                      <div className="text-[11px] text-cyan-100/90 font-medium mt-0.5">Workspaces</div>
                    </div>
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">620</div>
                      <div className="text-[11px] text-cyan-100/90 font-medium mt-0.5">Seats</div>
                    </div>
                    <div className="bg-white/10 py-3.5 text-center backdrop-blur-sm">
                      <div className="text-[17px] font-bold">$7,200</div>
                      <div className="text-[11px] text-cyan-100/90 font-medium mt-0.5">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col flex-1">
                  {/* Pricing Tiers */}
                  <div className="p-6 pb-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[11px] font-bold text-gray-400 tracking-widest">PRICING TIERS</h4>
                      <Link href="#" className="flex items-center text-[12px] font-medium text-[#00B4D8] hover:text-[#0096B4] transition-colors">
                        <SquarePen className="h-[14px] w-[14px] mr-1" /> Edit Plans
                      </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-[#00B4D8] leading-none">$0</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">FREE</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-[#00B4D8] leading-none">$19</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">LAUNCH</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1 bg-gray-50/50 dark:bg-gray-800/20">
                        <span className="text-[22px] font-bold text-[#00B4D8] leading-none">$49</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-2">GROWTH</span>
                      </div>
                      <div className="border border-gray-100 dark:border-gray-800 rounded-[6px] flex flex-col items-center justify-center py-4 px-1">
                        <span className="text-[22px] font-bold text-[#00B4D8] leading-none">$99</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-2">SCALE</span>
                      </div>
                    </div>
                  </div>

                  {/* By Plan */}
                  <div className="px-6 pb-6 border-b border-gray-50 dark:border-gray-800">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">BY PLAN</h4>
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Free</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#00B4D8] rounded-full" style={{ width: '10%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">6</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Scale</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#00B4D8] rounded-full" style={{ width: '80%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">28</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Growth</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#00B4D8] rounded-full" style={{ width: '80%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">28</span>
                      </div>
                      <div className="flex items-center text-[13px]">
                        <span className="w-16 text-gray-500 font-medium">Launch</span>
                        <div className="flex-1 h-[6px] bg-gray-100 dark:bg-gray-800 rounded-full mx-3">
                          <div className="h-full bg-[#00B4D8] rounded-full" style={{ width: '40%' }} />
                        </div>
                        <span className="w-6 text-right text-gray-400 font-medium">14</span>
                      </div>
                    </div>
                  </div>

                  {/* In Bundles */}
                  <div className="p-6 pb-6">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-3">IN BUNDLES</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Launch Bundle</Badge>
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Growth Bundle</Badge>
                      <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100/50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800 shadow-none font-medium text-[11px] px-2.5 py-1 rounded">Scale Bundle</Badge>
                    </div>
                  </div>

                  <div className="mt-auto px-6 pb-6">
                    <div className="flex bg-gray-50/80 dark:bg-gray-800/50 p-[3px] rounded-md border border-gray-100 dark:border-gray-800">
                      <Link href="/modules/service-desk" className="flex-1 text-center py-1.5 text-[13px] font-semibold bg-[#00B4D8] text-white rounded-[4px] shadow-sm">
                        Features
                      </Link>
                      <Link href="/modules/service-desk" className="flex-1 text-center py-1.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-[4px] transition-colors">
                        Pricing
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="bundles" className="mt-0 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
              
              {/* Launch Bundle Card */}
              <div className="flex flex-col bg-white dark:bg-gray-900 rounded-none border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-[#2563EB] text-white pt-5">
                  <div className="px-5 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-bold">Launch Bundle</h3>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[10px] px-1.5 py-0 rounded-sm shadow-none">Active</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Sales Workspace</Badge>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Service Workspace</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline text-white">
                        <span className="text-2xl font-bold">$29</span>
                      </div>
                      <span className="text-[11px] text-blue-100/80 font-medium">/user/mo</span>
                      <span className="text-[11px] text-blue-100/90 font-medium mt-0.5">$23 annual</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[1px] mt-5">
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">18</div>
                      <div className="text-[10px] text-blue-100/90 font-medium mt-0.5">Workspaces</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">220</div>
                      <div className="text-[10px] text-blue-100/90 font-medium mt-0.5">Seats</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">$6,380</div>
                      <div className="text-[10px] text-blue-100/90 font-medium mt-0.5">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-[12px] text-gray-500 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 mr-1.5" /> 14-day trial
                      </div>
                      <div className="flex items-center text-[12px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Annual billing
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-emerald-500">+8% MoM</div>
                  </div>

                  <div className="p-5 pb-4">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">INCLUDED FEATURES</h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                        Sales Launch features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                        Service Launch features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                        Shared inbox (3 accounts)
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                        5,000 tickets + 1,000 leads
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                        Basic SLA policies
                      </div>
                      <div className="text-[12px] text-gray-400 mt-1 font-medium">
                        +1 more features
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-5 pb-5">
                    <div className="flex gap-2">
                      <Button onClick={() => setIsBundleSheetOpen(true)} className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white rounded-none shadow-none font-medium h-9 text-[13px]">
                        <SquarePen className="w-3.5 h-3.5 mr-1.5" /> Edit Bundle
                      </Button>
                      <Button variant="outline" className="w-9 h-9 p-0 rounded-none border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Bundle Card */}
              <div className="flex flex-col bg-white dark:bg-gray-900 rounded-none border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-[#10B981] text-white pt-5">
                  <div className="px-5 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-bold">Growth Bundle</h3>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[10px] px-1.5 py-0 rounded-sm shadow-none">Active</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Sales Workspace</Badge>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Service Workspace</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline text-white">
                        <span className="text-2xl font-bold">$79</span>
                      </div>
                      <span className="text-[11px] text-green-100/80 font-medium">/user/mo</span>
                      <span className="text-[11px] text-green-100/90 font-medium mt-0.5">$63 annual</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[1px] mt-5">
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">34</div>
                      <div className="text-[10px] text-green-100/90 font-medium mt-0.5">Workspaces</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">510</div>
                      <div className="text-[10px] text-green-100/90 font-medium mt-0.5">Seats</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">$40,290</div>
                      <div className="text-[10px] text-green-100/90 font-medium mt-0.5">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-[12px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> 14-day trial
                      </div>
                      <div className="flex items-center text-[12px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Annual billing
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-emerald-500">+14% MoM</div>
                  </div>

                  <div className="p-5 pb-4">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">INCLUDED FEATURES</h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        Sales Growth features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        Service Growth features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        Shared inbox (5 accounts)
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        50,000 tickets + 5,000 leads
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        Advanced SLA + Reports
                      </div>
                      <div className="text-[12px] text-gray-400 mt-1 font-medium">
                        +1 more features
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-5 pb-5">
                    <div className="flex gap-2">
                      <Button onClick={() => setIsBundleSheetOpen(true)} className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white rounded-none shadow-none font-medium h-9 text-[13px]">
                        <SquarePen className="w-3.5 h-3.5 mr-1.5" /> Edit Bundle
                      </Button>
                      <Button variant="outline" className="w-9 h-9 p-0 rounded-none border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scale Bundle Card */}
              <div className="flex flex-col bg-white dark:bg-gray-900 rounded-none border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-[#8B5CF6] text-white pt-5">
                  <div className="px-5 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[17px] font-bold">Scale Bundle</h3>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[10px] px-1.5 py-0 rounded-sm shadow-none">Active</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Sales Workspace</Badge>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium text-[11px] px-2 py-0.5 rounded-sm shadow-none">Service Workspace</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline text-white">
                        <span className="text-2xl font-bold">$149</span>
                      </div>
                      <span className="text-[11px] text-purple-100/80 font-medium">/user/mo</span>
                      <span className="text-[11px] text-purple-100/90 font-medium mt-0.5">$119 annual</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[1px] mt-5">
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">12</div>
                      <div className="text-[10px] text-purple-100/90 font-medium mt-0.5">Workspaces</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">290</div>
                      <div className="text-[10px] text-purple-100/90 font-medium mt-0.5">Seats</div>
                    </div>
                    <div className="bg-white/10 py-3 text-center backdrop-blur-sm">
                      <div className="text-[15px] font-bold">$43,210</div>
                      <div className="text-[10px] text-purple-100/90 font-medium mt-0.5">MRR</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-[12px] text-gray-500 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 mr-1.5" /> 14-day trial
                      </div>
                      <div className="flex items-center text-[12px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> Annual billing
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-emerald-500">+19% MoM</div>
                  </div>

                  <div className="p-5 pb-4">
                    <h4 className="text-[11px] font-bold text-gray-400 tracking-widest mb-4">INCLUDED FEATURES</h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-[#8B5CF6] mr-2 shrink-0 mt-0.5" />
                        Sales Scale features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-[#8B5CF6] mr-2 shrink-0 mt-0.5" />
                        Service Scale features
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-[#8B5CF6] mr-2 shrink-0 mt-0.5" />
                        Unlimited tickets + leads
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-[#8B5CF6] mr-2 shrink-0 mt-0.5" />
                        Audit logs
                      </div>
                      <div className="flex items-start text-[13px] text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-[#8B5CF6] mr-2 shrink-0 mt-0.5" />
                        Custom onboarding
                      </div>
                      <div className="text-[12px] text-gray-400 mt-1 font-medium">
                        +1 more features
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-5 pb-5">
                    <div className="flex gap-2">
                      <Button onClick={() => setIsBundleSheetOpen(true)} className="flex-1 bg-[#8B5CF6] hover:bg-purple-600 text-white rounded-none shadow-none font-medium h-9 text-[13px]">
                        <SquarePen className="w-3.5 h-3.5 mr-1.5" /> Edit Bundle
                      </Button>
                      <Button variant="outline" className="w-9 h-9 p-0 rounded-none border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Bundle Card */}
              <div onClick={() => setIsBundleSheetOpen(true)} className="flex flex-col items-center justify-center bg-transparent border-[1.5px] border-dashed border-gray-200 dark:border-gray-800 rounded-none h-[calc(100%-1.5rem)] min-h-[400px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group mt-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-blue-600 dark:text-blue-400">Create Bundle</h3>
                <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400 text-center px-6">
                  Combine modules into a discounted plan
                </p>
              </div>

            </div>
          </TabsContent>
        </Tabs>

        {/* Create Bundle Sheet */}
        <Sheet open={isBundleSheetOpen} onOpenChange={setIsBundleSheetOpen}>
          <SheetContent side="right" className="w-[450px] sm:max-w-[450px] p-0 flex flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
            <SheetHeader className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-row items-center justify-between shadow-sm z-10 shrink-0">
              <SheetTitle className="text-[17px] font-bold text-gray-900 m-0 p-0">Create Bundle</SheetTitle>
            </SheetHeader>
            <div className="px-6 py-5 flex-1 overflow-y-auto flex flex-col gap-6 custom-scrollbar bg-gray-50/30">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-gray-600">Bundle Name</Label>
                  <div className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox id="bundle-active" defaultChecked className="h-3.5 w-3.5 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white rounded-[2px]" />
                    <label htmlFor="bundle-active" className="text-[10px] font-bold text-gray-600 tracking-wider cursor-pointer mt-0.5">ACTIVE</label>
                  </div>
                </div>
                <Input defaultValue="Growth" className="h-[40px] text-[13px] font-medium bg-white border-gray-200 rounded-[4px]" />
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-medium text-gray-600">Plan Category</Label>
                <Select defaultValue="Select">
                  <SelectTrigger className="h-[40px] text-[13px] bg-white border-gray-200 rounded-[4px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select">Select</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-gray-600">Monthly Price</Label>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox id="monthly-active2" defaultChecked className="h-3.5 w-3.5 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white rounded-[2px]" />
                      <label htmlFor="monthly-active2" className="text-[10px] font-bold text-gray-600 tracking-wider cursor-pointer mt-0.5">ACTIVE</label>
                    </div>
                  </div>
                  <Input defaultValue="$99.00" className="h-[40px] text-[13px] font-medium bg-white border-gray-200 rounded-[4px]" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-gray-600">Annual Price</Label>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox id="annual-active2" defaultChecked className="h-3.5 w-3.5 border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white rounded-[2px]" />
                      <label htmlFor="annual-active2" className="text-[10px] font-bold text-gray-600 tracking-wider cursor-pointer mt-0.5">ACTIVE</label>
                    </div>
                  </div>
                  <Input defaultValue="$990.00" className="h-[40px] text-[13px] font-medium bg-white border-gray-200 rounded-[4px]" />
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-1 bg-white p-3 border border-gray-100 rounded-[4px] shadow-sm">
                <Checkbox id="recommended-bundle" defaultChecked className="h-4 w-4 border-blue-600 data-[state=checked]:bg-blue-600 rounded-[3px]" />
                <label htmlFor="recommended-bundle" className="text-[13px] text-gray-800 font-medium cursor-pointer flex-1">
                  Mark as 'Recommended Plan'
                </label>
              </div>

              <div className="space-y-3 mt-2">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Included Modules</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-[4px] p-3 shadow-sm hover:border-blue-200 transition-colors">
                    <Checkbox id="mod-sales" defaultChecked className="mt-1 h-4 w-4 border-gray-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 rounded-[3px]" />
                    <div className="flex gap-3">
                      <div className="mt-0.5 h-6 w-6 flex items-center justify-center rounded-[4px] bg-blue-600 text-white shrink-0">
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label htmlFor="mod-sales" className="text-[14px] font-bold text-gray-900 cursor-pointer">Sales Workspace</label>
                        <p className="text-[12px] text-gray-500 leading-tight">Lead management, pipelines, and forecasting tools.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-[4px] p-3 shadow-sm hover:border-blue-200 transition-colors opacity-70">
                    <Checkbox id="mod-service" className="mt-1 h-4 w-4 border-gray-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 rounded-[3px]" />
                    <div className="flex gap-3">
                      <div className="mt-0.5 h-6 w-6 flex items-center justify-center rounded-[4px] bg-[#00B4D8] text-white shrink-0">
                        <Headset className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label htmlFor="mod-service" className="text-[14px] font-bold text-gray-900 cursor-pointer">Service Workspace</label>
                        <p className="text-[12px] text-gray-500 leading-tight">Ticketing, SLAs, and customer support channels.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-2">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Bundle Options</h4>
                <div className="flex items-start justify-between gap-4 bg-white border border-gray-200 rounded-[4px] p-3 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-bold text-gray-900">14-day trial eligible</span>
                    <p className="text-[12px] text-gray-500 leading-tight">New workspaces get Growth-level access for 14 days before upgrade</p>
                  </div>
                  <Switch className="data-[state=checked]:bg-blue-600 mt-1" />
                </div>
              </div>

              <div className="space-y-3 mt-2 pb-6">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">Features Included</h4>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-[4px] p-2 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="cursor-grab text-gray-300 hover:text-gray-500">
                      <GripVertical className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 text-[13px] text-gray-700 font-medium">
                      Lead Management
                    </div>
                    <Input defaultValue="500" className="h-[32px] w-[60px] text-center text-[13px] font-medium px-2 rounded-[4px] border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500" />
                    <Button variant="ghost" size="icon" className="h-[32px] w-[32px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-[4px]">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
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
              <Button variant="ghost" className="h-9 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 px-4" onClick={() => setIsBundleSheetOpen(false)}>
                Cancel
              </Button>
              <Button className="h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-[13px] rounded-[4px] shadow-sm px-6" onClick={() => setIsBundleSheetOpen(false)}>
                Save Changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </PageBody>
    </AppShell>
  );
}
