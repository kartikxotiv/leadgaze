'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Terminal } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader, PageHeaderActions } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { Skeleton } from '@kit/ui/skeleton';
import { useLocalization } from '@kit/shared/localization';

import type { Connector } from '../types';

interface Account {
  id: string;
  name: string;
  email: string;
}

export interface WebsiteConnectorListPageProps {
  workspaceId: string;
  supabase: any;
  connectors: Connector[];
  isConnectorsLoading: boolean;
  onNavigateToConnector: (connectorId: string) => void;
  onNavigateBack: () => void;
  onCreateConnector: (payload: {
    workspace_id: string;
    name: string;
    destination_module: string;
    destination_entity: string;
    default_owner_id?: string | null;
    type: string;
  }) => Promise<Connector>;
  onConnectorCreated?: (connector: Connector) => void;
}

export function WebsiteConnectorListPage({
  workspaceId,
  supabase,
  connectors,
  isConnectorsLoading,
  onNavigateToConnector,
  onNavigateBack,
  onCreateConnector,
  onConnectorCreated,
}: WebsiteConnectorListPageProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newConnectorName, setNewConnectorName] = useState('');
  const [newConnectorOwner, setNewConnectorOwner] = useState<string>('');

  const { formatDate } = useLocalization();

  useEffect(() => {
    if (workspaceId) {
      loadAccounts();
    }
  }, [workspaceId]);

  const loadAccounts = async () => {
    try {
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          accounts:user_id (id, name, email)
        `)
        .eq('workspace_id', workspaceId);

      if (membersData) {
        const fetchedAccounts = membersData
          .map((m: any) => m.accounts)
          .filter(Boolean) as Account[];
        setAccounts(fetchedAccounts);
        if (fetchedAccounts.length > 0 && fetchedAccounts[0]) {
          setNewConnectorOwner(fetchedAccounts[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateConnector = async () => {
    if (!newConnectorName.trim()) {
      toast.error('Connector Name is required.');
      return;
    }
    setIsCreating(true);
    try {
      const connector = await onCreateConnector({
        workspace_id: workspaceId,
        name: newConnectorName,
        destination_module: 'crm',
        destination_entity: 'lead',
        default_owner_id: newConnectorOwner || null,
        type: 'website',
      });
      toast.success('Connector created successfully!');
      setIsCreateOpen(false);
      setNewConnectorName('');
      onConnectorCreated?.(connector);
      onNavigateToConnector(connector.id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create connector.');
    } finally {
      setIsCreating(false);
    }
  };

  const CreateConnectorForm = () => (
    <>
      <DialogHeader>
        <DialogTitle>Create Website Connector</DialogTitle>
        <DialogDescription>
          Configure a new endpoint structure for web integration.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="cname">Connector Name</Label>
          <Input
            id="cname"
            placeholder="e.g. Main Landing Page Form"
            value={newConnectorName}
            onChange={(e) => setNewConnectorName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cowner">Default Owner</Label>
          <Select value={newConnectorOwner} onValueChange={setNewConnectorOwner}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Default Assignee" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name || acc.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreateConnector} disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Connector'}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNavigateBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Website Connectors</span>
          </div>
        }
        description="Configure embeddable forms and secure API endpoints to receive website leads."
      >
        <PageHeaderActions>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Connector
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <CreateConnectorForm />
            </DialogContent>
          </Dialog>
        </PageHeaderActions>
      </PageHeader>

      <PageBody className="flex min-w-0 flex-1 shrink-0 flex-col gap-6 py-6 pb-12">
        {isConnectorsLoading ? (
          <Card className="overflow-hidden border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Name</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Status</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Default Assignee</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Created At</TableHead>
                  <TableHead className="px-6 py-2.5 text-right font-semibold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-6 py-3" colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : connectors.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
            <Terminal className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-bold">No Connector Setup Found</h2>
            <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
              Get started by creating your first Website Connector to capture
              incoming inquiries.
            </p>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>Create First Connector</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <CreateConnectorForm />
              </DialogContent>
            </Dialog>
          </Card>
        ) : (
          <Card className="overflow-hidden border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Name</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Status</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Default Assignee</TableHead>
                  <TableHead className="px-6 py-2.5 font-semibold text-xs">Created At</TableHead>
                  <TableHead className="px-6 py-2.5 text-right font-semibold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectors.map((c) => {
                  const assignee = accounts.find(
                    (a) => a.id === c.default_owner_id,
                  );
                  return (
                    <TableRow key={c.id} className="hover:bg-accent/5">
                      <TableCell className="px-6 py-2 font-medium text-sm">
                        <button
                          onClick={() => onNavigateToConnector(c.id)}
                          className="text-left font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-2">
                        <Badge
                          variant={
                            c.status === 'active' ? 'default' : 'secondary'
                          }
                          className="text-[10px] px-2 py-0"
                        >
                          {c.status === 'active' ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-2 text-xs text-muted-foreground">
                        {assignee
                          ? assignee.name || assignee.email
                          : 'Unassigned'}
                      </TableCell>
                      <TableCell className="px-6 py-2 text-xs text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell className="px-6 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onNavigateToConnector(c.id)}
                        >
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageBody>
    </>
  );
}
