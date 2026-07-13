'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

interface WorkspaceGeneralSettingsProps {
  workspaceId: string;
}

export function WorkspaceGeneralSettings({ workspaceId }: WorkspaceGeneralSettingsProps) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const supabase = getSupabaseBrowserClient();

  const [workspaceName, setWorkspaceName] = useState('');
  const [slug, setSlug] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [taxId, setTaxId] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoFileCleared, setLogoFileCleared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
            tax_id
          )
        `)
        .eq('id', workspaceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Sync state with fetched details
  useEffect(() => {
    if (workspaceData) {
      setWorkspaceName(workspaceData.name || '');
      setSlug(workspaceData.slug || '');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const company = (workspaceData as any).companies;
      if (company) {
        setCompanyName(company.name || '');
        setBillingCountry(company.billing_country || '');
        setCompanyLogoUrl(company.logo_url || null);
        setTaxId(company.tax_id || '');
      }
    }
  }, [workspaceData]);

  const handleLogoSelect = (file: File | null) => {
    setLogoFile(file);
    if (file === null) {
      setLogoFileCleared(true);
    } else {
      setLogoFileCleared(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const isNewIndia = billingCountry === 'IN' || billingCountry?.toLowerCase() === 'india';

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

      // Validate Tax ID if changed and provided
      // Validate Tax ID if tax ID or billing country has changed
      const originalTaxId = (workspaceData as any)?.companies?.tax_id || '';
      const originalBillingCountry = (workspaceData as any)?.companies?.billing_country || '';
      if (taxId.trim() && (taxId.trim() !== originalTaxId || billingCountry !== originalBillingCountry)) {
        const valResponse = await fetch('/api/companies/validate-tax', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country_iso: billingCountry,
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

      // 2. Create or Update company details
      if (currentCompanyId) {
        const companyResponse = await fetch(`/api/companies/${currentCompanyId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: companyName,
            billing_country: billingCountry,
            logo_url: logoUrl,
            tax_id: taxId.trim() || null,
          }),
        });

        if (!companyResponse.ok) {
          const errorData = await companyResponse.json();
          throw new Error(errorData.message || 'Failed to update company details');
        }
      } else {
        // Create company on-the-fly
        const companyResponse = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: companyName,
            billing_country: billingCountry,
            logo_url: logoUrl,
            tax_id: taxId.trim() || null,
            created_by: user?.id,
          }),
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

      // Reset file states
      setLogoFile(null);
      setLogoFileCleared(false);

      // Refresh queries
      refetch();
      queryClient.invalidateQueries({ queryKey: ['workspace-general-settings', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="mb-0 flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Company Profile
          </CardTitle>
          <CardDescription>
            Manage your company profile details and branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={handleSave} className="space-y-6 max-w-xl">
            {/* Logo */}
            <LogoUploader
              companyName={companyName || workspaceName}
              onFileSelect={handleLogoSelect}
              disabled={isSaving}
              initialLogoUrl={companyLogoUrl}
            />

            {/* Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-leadgaze-dark dark:text-white">
                  Company Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-leadgaze-dark dark:text-white">
                  Billing Country
                </label>
                <CountrySelect
                  value={billingCountry}
                  onValueChange={setBillingCountry}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-leadgaze-dark dark:text-white">
                  Tax ID / TIN (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 196700197W"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  disabled={isSaving}
                />
                {/* <p className="text-xs text-slate-500 mt-1">
                  This Tax ID will be used for your payments to Leadgaze.
                </p> */}
              </div>

              <div className="border-t pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-medium text-leadgaze-dark dark:text-white">
                  Workspace Settings
                </h4>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-leadgaze-dark dark:text-white">
                    Workspace Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Workspace Name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-leadgaze-dark dark:text-white">
                    Workspace Handle
                  </label>
                  <Input
                    type="text"
                    value={slug}
                    readOnly
                    placeholder="workspace-slug"
                    className="bg-slate-50 dark:bg-slate-900 cursor-not-allowed opacity-70"
                  />
                  <p className="text-xs text-slate-500">
                    Workspace handle is permanent and cannot be changed.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-start">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none rounded-lg"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
