'use client';

import { useState } from 'react';
import { CreditCard, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

export function WorkspaceSubscriptionSettings() {
  const [expandedSection, setExpandedSection] = useState<string | null>('sales-crm');

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 border-b border-slate-200">
        <button className="px-2 border border-slate-200 rounded-md primary-text-medium text-leadgaze-dark dark:text-white flex items-center gap-2 bg-white h-9">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          Active Modules (2)
        </button>
        <button className="px-2 border border-slate-200 rounded-md primary-text-medium text-leadgaze-dark dark:text-white flex items-center gap-2 bg-white h-9">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Total Seats (3)
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-slate-200 pb-1">
          <CardTitle className="primary-text-big-regular text-leadgaze-dark dark:text-white mb-0">Your Modules</CardTitle>
          <div className="secondary-text-small-bold text-leadgaze-dark dark:text-white">2 MODULES</div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-2 px-2 py-2 border-b border-slate-200 secondary-text-small-bold text-leadgaze-dark dark:text-white uppercase">
            <div>Module</div>
            <div>Status</div>
            <div className="text-center">Seats</div>
            <div className="text-center">Price / Seat</div>
            <div className="text-center">Total</div>
            <div className="w-24"></div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {/* Service Cloud */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-2 p-2 items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-600">
                  <span className="text-lg">🎧</span>
                </div>
                <div>
                  <div className="primary-text-medium text-leadgaze-dark dark:text-white">Service Cloud</div>
                  <div className="text-xs text-leadgaze-dark dark:text-white">1/1 used</div>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-xs px-2 py-0">Active</Badge>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-leadgaze-dark dark:text-white">−</button>
                <span className="text-sm font-semibold text-leadgaze-dark dark:text-white w-2 text-center">1</span>
                <button className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-leadgaze-dark dark:text-white">+</button>
              </div>
              <div className="text-center text-sm font-semibold text-leadgaze-dark dark:text-white">$10/mo</div>
              <div className="text-center text-sm font-semibold text-leadgaze-dark dark:text-white">$10/mo</div>
              <div className="w-16 flex justify-end">
                <button className="text-xs font-semibold text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            </div>

            {/* Sales CRM */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-2 p-2 items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <span className="text-lg">🛒</span>
                </div>
                <div>
                  <div className="primary-text-medium text-leadgaze-dark dark:text-white">Sales CRM</div>
                  <div className="text-xs text-leadgaze-dark dark:text-white">2/2 used</div>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-xs px-2 py-0">Active</Badge>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-leadgaze-dark dark:text-white">−</button>
                <span className="text-sm font-semibold text-leadgaze-dark dark:text-white w-2 text-center">2</span>
                <button className="w-6 h-6 flex items-center justify-center border border-slate-200 rounded text-leadgaze-dark dark:text-white">+</button>
              </div>
              <div className="text-center text-sm font-semibold text-leadgaze-dark dark:text-white">$15/mo</div>
              <div className="text-center text-sm font-semibold text-leadgaze-dark dark:text-white">$30/mo</div>
              <div className="w-16 flex justify-end">
                <button className="text-xs font-semibold text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            </div>
            
            {/* Breakdowns */}
            <div>
              {/* Service Cloud Breakdown */}
              <div 
                className="flex justify-between items-center p-2 border-b border-slate-100 text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSection('service-cloud')}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-orange-600 text-xs">$10/seat/mo</span>
                  <span className="text-leadgaze-dark dark:text-white text-xs">1 seat × $10</span>
                </div>
                <div className="text-leadgaze-dark dark:text-white text-xs flex items-center gap-1 font-medium">
                  View members <ChevronDown className={`w-3 h-3 transition-transform ${expandedSection === 'service-cloud' ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {expandedSection === 'service-cloud' && (
                <div className="p-2 space-y-2 bg-white border-b border-slate-100">
                  <div className="text-xs text-slate-500 p-2 text-center font-medium">No members assigned yet.</div>
                </div>
              )}
              
              {/* Sales CRM Breakdown */}
              <div 
                className={`flex justify-between items-center p-2 border-b border-slate-100 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${expandedSection === 'sales-crm' ? 'bg-white' : ''}`}
                onClick={() => toggleSection('sales-crm')}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-600 text-xs">$15/seat/mo</span>
                  <span className="text-leadgaze-dark text-xs">2 seats × $15</span>
                </div>
                <div className="text-leadgaze-dark text-xs flex items-center gap-1 font-medium">
                  View members <ChevronDown className={`w-3 h-3 transition-transform ${expandedSection === 'sales-crm' ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {/* Expanded members list for Sales CRM (Mocked) */}
              {expandedSection === 'sales-crm' && (
                <div className="p-2 space-y-2 bg-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 secondary-text-small-bold font-bold">
                        S
                      </div>
                      <div>
                        <div className="primary-text-medium text-slate-800">Sales Manager</div>
                        <div className="text-[10px] text-slate-500">sales.manager.staging@yopmail.com</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-[10px] px-2 py-0">Active</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 secondary-text-small-bold font-bold">
                        K
                      </div>
                      <div>
                        <div className="primary-text-medium text-slate-800">kartik</div>
                        <div className="text-[10px] text-slate-500">kartik.staging1@yopmail.com</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold text-[10px] px-2 py-0">Active</Badge>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-slate-200">
          <div className="mb-0">
            <CardTitle className="mb-0 primary-text-big-regular text-leadgaze-dark dark:text-white">Payment Method</CardTitle>
            <CardDescription className="text-xs">
              Payment for domains, emails, and other usage are made using the default card.
            </CardDescription>
          </div>
          <Button className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2">Add Card</Button>
        </CardHeader>
        <CardContent className="mb-1 p-0">
          <div className="flex justify-between items-center border-b border-slate-200">
            <div className="flex items-center gap-2 p-2">
              <div className="w-8 h-6 bg-slate-50 rounded border flex items-center justify-center shadow-sm">
                <div className="flex -space-x-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 mix-blend-multiply"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 mix-blend-multiply"></div>
                </div>
              </div>
              <span className="secondary-text-small-bold text-leadgaze-dark dark:text-white">Master Card Credit .... 4575</span>
            </div>
            <div className="secondary-text-small-bold text-leadgaze-dark dark:text-white font-medium text-slate-800 pr-4">
              Valid until 2/2032
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
