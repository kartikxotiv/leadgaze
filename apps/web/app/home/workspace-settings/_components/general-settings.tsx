'use client';

import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';

import { CountrySelect } from '~/workspace-setup/_components/CountrySelect';
import { LogoUploader } from '~/workspace-setup/_components/LogoUploader';
import { WorkspaceSwitcher } from '../../_components/workspace-switcher';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Label } from '@kit/ui/label';

interface WorkspaceGeneralSettingsProps {
  workspaceId: string;
}

export function WorkspaceGeneralSettings({ workspaceId }: WorkspaceGeneralSettingsProps) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const supabase = getSupabaseBrowserClient();
  const { workspaces } = useRBAC();

  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  
  // Company Profile
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  // Invoice Details
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoiceCity, setInvoiceCity] = useState('');
  const [invoicePostalCode, setInvoicePostalCode] = useState('');
  const [invoiceCountry, setInvoiceCountry] = useState('');
  const [invoiceState, setInvoiceState] = useState('');
  const [taxId, setTaxId] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFileCleared, setLogoFileCleared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track if form is modified
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current workspace and company details
  const { data: workspaceData, isLoading, refetch } = useQuery({
    queryKey: ['workspace-general-settings', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          slug,
          company_id,
          companies (
            id,
            name,
            billing_country,
            logo_url,
            tax_id,
            email,
            phone,
            address,
            postal_code,
            country,
            city,
            state,
            
            invoice_address,
            invoice_city,
            invoice_postal_code,
            
            invoice_state
          )
        `)
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const resetForm = () => {
    if (workspaceData) {
      setWorkspaceName(workspaceData.name || '');
      setSlug(workspaceData.slug || '');

      const company = (workspaceData as any).companies;
      if (company) {
        setCompanyName(company.name || '');
        setCompanyEmail(company.email || '');
        setCompanyPhone(company.phone || '');
        setCompanyAddress(company.address || '');
        setCompanyPostalCode(company.postal_code || '');
        setCompanyCountry(company.country || '');
        setCompanyLogoUrl(company.logo_url || null);
        
        setInvoiceCompanyName(company.name || '');
        setInvoiceAddress(company.invoice_address || '');
        setInvoiceCity(company.invoice_city || '');
        setInvoicePostalCode(company.invoice_postal_code || '');
        setInvoiceCountry(company.billing_country || '');
        setInvoiceState(company.invoice_state || '');
        setTaxId(company.tax_id || '');
      }
      setLogoFile(null);
      setLogoFileCleared(false);
      setIsDirty(false);
    }
  };

  // Sync state with fetched details
  useEffect(() => {
    resetForm();
  }, [workspaceData]);
  
  const handleFieldChange = (setter: any) => (value: any) => {
    setter(value);
    setIsDirty(true);
  };
  
  const handleEventChange = (setter: any) => (e: any) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const handleLogoSelect = (file: File | null) => {
    setLogoFile(file);
    if (file === null) {
      setLogoFileCleared(true);
    } else {
      setLogoFileCleared(false);
    }
    setIsDirty(true);
  };
  
  const handleCancel = () => {
    resetForm();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }
    if (!workspaceName.trim()) {
      toast.error('Workspace Name is required');
      return;
    }

    const originalBillingCountry = (workspaceData as any)?.companies?.billing_country || '';
    const isOriginalIndia = originalBillingCountry === 'IN' || originalBillingCountry?.toLowerCase() === 'india';
    const isNewIndia = invoiceCountry === 'IN' || invoiceCountry?.toLowerCase() === 'india';

    if (isOriginalIndia && !isNewIndia) {
      toast.error('Contact support team to switch your billing country from India to another');
      return;
    }
    if (!isOriginalIndia && isNewIndia) {
      toast.error('Contact support team to switch your billing country to India');
      return;
    }

    setIsSaving(true);

    try {
      let logoUrl = companyLogoUrl;

      // 1. Upload logo if a new one is selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('companies-logo')
          .upload(fileName, logoFile);

        if (uploadError) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('companies-logo')
          .getPublicUrl(uploadData.path);

        logoUrl = publicUrlData.publicUrl;
      } else if (logoFileCleared) {
        logoUrl = null;
      }

      const originalTaxId = (workspaceData as any)?.companies?.tax_id || '';
      if (taxId.trim() && (taxId.trim() !== originalTaxId || invoiceCountry !== originalBillingCountry)) {
        const valResponse = await fetch('/api/companies/validate-tax', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country_iso: invoiceCountry,
            tin: taxId.trim(),
          }),
        });

        if (!valResponse.ok) {
          const errData = await valResponse.json();
          throw new Error(errData.message || 'Tax ID validation failed.');
        }

        const { data: valResult } = await valResponse.json();
        if (!valResult.isValid) {
          throw new Error(`Tax ID is invalid: ${valResult.message}`);
        }
      }

      let currentCompanyId = workspaceData?.company_id;
      
      const companyPayload = {
        name: companyName,
        country: companyCountry,
        billing_country: invoiceCountry,
        logo_url: logoUrl,
        tax_id: taxId.trim() || null,
        email: companyEmail,
        phone: companyPhone,
        address: companyAddress,
        postal_code: companyPostalCode,
        invoice_address: invoiceAddress,
        invoice_city: invoiceCity,
        invoice_postal_code: invoicePostalCode,
        invoice_state: invoiceState
      };

      // 2. Create or Update company details
      if (currentCompanyId) {
        const companyResponse = await fetch(`/api/companies/${currentCompanyId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(companyPayload),
        });

        if (!companyResponse.ok) {
          const errorData = await companyResponse.json();
          throw new Error(errorData.message || 'Failed to update company details');
        }
      } else {
        const companyResponse = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...companyPayload, created_by: user?.id }),
        });

        if (!companyResponse.ok) {
          const errorData = await companyResponse.json();
          throw new Error(errorData.message || 'Failed to create company details');
        }

        const { data: companyData } = await companyResponse.json();
        currentCompanyId = companyData.id;
      }

      // 3. Update workspace details
      const workspaceResponse = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName,
          company_id: currentCompanyId,
        }),
      });

      if (!workspaceResponse.ok) {
        const errorData = await workspaceResponse.json();
        throw new Error(errorData.message || 'Failed to update workspace details');
      }

      toast.success('Settings saved', {
        description: 'Company and workspace details have been updated.',
      });

      // Refresh queries
      refetch();
      queryClient.invalidateQueries({ queryKey: ['workspace-general-settings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setIsDirty(false);
    } catch (error: any) {
      console.error('Failed to update company/workspace details:', error);
      toast.error('Failed to save settings', {
        description: error?.message || 'Something went wrong.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workspaces.length > 1 && (
        <Card>
          <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="mb-0 flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Workspace Management
              </CardTitle>
              <CardDescription>
                Select and manage your active workspace.
              </CardDescription>
            </div>
            <div className="w-[300px] border border-input rounded-md bg-background shadow-sm">
              <WorkspaceSwitcher />
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-slate-200">
          <div>
            <CardTitle className="mb-0 flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Company Profile
            </CardTitle>
            <CardDescription>
              Manage your company profile details and branding.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="secondary-text-small-bold gap-1.5 px-2"
              onClick={handleCancel}
              disabled={!isDirty || isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 space-y-2 main-dialog">
          <div className="space-y-2">
            <LogoUploader
              companyName={companyName || workspaceName}
              onFileSelect={handleLogoSelect}
              disabled={isSaving}
              initialLogoUrl={companyLogoUrl}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label>Company Name</Label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={handleEventChange(setCompanyName)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Mail ID</Label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={handleEventChange(setCompanyEmail)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Mobile number</Label>
                <Input
                  type="tel"
                  value={companyPhone}
                  onChange={handleEventChange(setCompanyPhone)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label>Address</Label>
                <Input
                  type="text"
                  value={companyAddress}
                  onChange={handleEventChange(setCompanyAddress)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  type="text"
                  value={companyPostalCode}
                  onChange={handleEventChange(setCompanyPostalCode)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label>Country</Label>
                <CountrySelect
                  value={companyCountry}
                  onValueChange={handleFieldChange(setCompanyCountry)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-2">
            <h3 className="primary-heading text-leadgaze-dark tracking-tight dark:text-white">Invoice Details</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    type="text"
                    value={invoiceCompanyName}
                    onChange={handleEventChange(setInvoiceCompanyName)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label>Street Address</Label>
                  <Input
                    type="text"
                    value={invoiceAddress}
                    onChange={handleEventChange(setInvoiceAddress)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    type="text"
                    value={invoiceCity}
                    onChange={handleEventChange(setInvoiceCity)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label>Postal Code</Label>
                  <Input
                    type="text"
                    value={invoicePostalCode}
                    onChange={handleEventChange(setInvoicePostalCode)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <CountrySelect
                    value={invoiceCountry}
                    onValueChange={handleFieldChange(setInvoiceCountry)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    type="text"
                    value={invoiceState}
                    onChange={handleEventChange(setInvoiceState)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label>Tax ID</Label>
                  <Input
                    type="text"
                    placeholder="#123456"
                    value={taxId}
                    onChange={handleEventChange(setTaxId)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-2">
            <h3 className="primary-heading text-leadgaze-dark tracking-tight dark:text-white">Workspace Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label>
                  Workspace Name
                </Label>
                <Input
                  type="text"
                  placeholder="Workspace Name"
                  value={workspaceName}
                  onChange={handleEventChange(setWorkspaceName)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div>
                <Label>
                  Workspace Handle
                </Label>
                <Input
                  type="text"
                  value={slug}
                  readOnly
                  placeholder="workspace-slug"
                  className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed opacity-70"
                />
                <p className="text-xs text-slate-500 pt-1">
                  Workspace handle is permanent and cannot be changed.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
