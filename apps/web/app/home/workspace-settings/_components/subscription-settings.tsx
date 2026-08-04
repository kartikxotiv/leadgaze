'use client';

import { CreditCard, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

export function WorkspaceSubscriptionSettings() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        <button className="px-4 py-2 border-b-2 border-primary text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          Active Modules (2)
        </button>
        <button className="px-4 py-2 border-b-2 border-transparent text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          Total Seats (3)
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b">
          <CardTitle className="text-base">Your Modules</CardTitle>
          <div className="text-sm font-semibold text-muted-foreground">2 MODULES</div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
            <div>Module</div>
            <div>Status</div>
            <div className="text-center">Seats</div>
            <div className="text-right">Price / Seat</div>
            <div className="text-right">Total</div>
            <div className="w-16"></div>
          </div>
          
          <div className="divide-y">
            {/* Service Cloud */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                  <span className="text-xl">🎧</span>
                </div>
                <div>
                  <div className="font-semibold text-sm">Service Cloud</div>
                  <div className="text-xs text-muted-foreground">1/1 used</div>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button className="px-3 py-1 hover:bg-muted text-muted-foreground">−</button>
                  <span className="px-3 py-1 text-sm border-x">1</span>
                  <button className="px-3 py-1 hover:bg-muted text-muted-foreground">+</button>
                </div>
              </div>
              <div className="text-right text-sm font-medium">$10/mo</div>
              <div className="text-right text-sm font-medium">$10/mo</div>
              <div className="w-16 flex justify-end">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  Remove
                </Button>
              </div>
            </div>

            {/* Sales CRM */}
            <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                  <span className="text-xl">🛒</span>
                </div>
                <div>
                  <div className="font-semibold text-sm">Sales CRM</div>
                  <div className="text-xs text-muted-foreground">2/2 used</div>
                </div>
              </div>
              <div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button className="px-3 py-1 hover:bg-muted text-muted-foreground">−</button>
                  <span className="px-3 py-1 text-sm border-x">2</span>
                  <button className="px-3 py-1 hover:bg-muted text-muted-foreground">+</button>
                </div>
              </div>
              <div className="text-right text-sm font-medium">$15/mo</div>
              <div className="text-right text-sm font-medium">$30/mo</div>
              <div className="w-16 flex justify-end">
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  Remove
                </Button>
              </div>
            </div>
            
            {/* Breakdowns */}
            <div className="bg-slate-50/50">
              <div className="flex justify-between items-center p-3 px-4 border-b text-sm">
                <div className="flex items-center gap-4 text-orange-600">
                  <span className="font-semibold">$10/seat/mo</span>
                  <span className="text-muted-foreground">1 seat × $10</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground">
                  View members <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 px-4 border-b text-sm">
                <div className="flex items-center gap-4 text-blue-600">
                  <span className="font-semibold">$15/seat/mo</span>
                  <span className="text-muted-foreground">2 seats × $15</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground">
                  View members <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              
              {/* Expanded members list for Sales CRM (Mocked) */}
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                      S
                    </div>
                    <div>
                      <div className="text-sm font-medium">Sales Manager</div>
                      <div className="text-xs text-muted-foreground">sales.manager.staging@yopmail.com</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                      K
                    </div>
                    <div>
                      <div className="text-sm font-medium">kartik</div>
                      <div className="text-xs text-muted-foreground">kartik.staging1@yopmail.com</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                </div>
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 pb-3">
          <div>
            <CardTitle className="mb-0 text-base">Payment Method</CardTitle>
            <CardDescription>
              Payment for domains, emails, and other usage are made using the default card.
            </CardDescription>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Add Card</Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-center border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-slate-100 rounded border flex items-center justify-center">
                <div className="flex -space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 mix-blend-multiply"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-400 mix-blend-multiply"></div>
                </div>
              </div>
              <span className="text-sm font-medium">Master Card Credit .... 4575</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Valid until 2/2032
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
