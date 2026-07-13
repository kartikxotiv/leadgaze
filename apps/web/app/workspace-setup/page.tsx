'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Briefcase,
  Check,
  Headphones,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Switch } from '@kit/ui/switch';

import { CountrySelect } from './_components/CountrySelect';
import { LogoUploader } from './_components/LogoUploader';
import { DashboardPreview } from './_components/DashboardPreview';

import { Footer, persistBillingCountry } from '../_components/footer';

import pathsConfig from '~/config/paths.config';
// eslint-disable-line @typescript-eslint/no-unused-vars
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { data: user, isPending: _isPending } = useUser();
  const queryClient = useQueryClient();

  const [workspaceName, setWorkspaceName] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(true);

  // "Heard about us" state
  const [heardAbout, setHeardAbout] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');

  // "Customize" state
  interface Product {
    id: string;
    product_key: string;
    display_name: string;
  }
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'create' | 'heard' | 'customize' | 'final_placeholder'>('info');

  // Onboarding IDs — set from DB on resume, or from API response on first creation
  const [onboardingWorkspaceId, setOnboardingWorkspaceId] = useState('');
  const [onboardingCompanyId, setOnboardingCompanyId] = useState('');

  const slug = workspaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
    }
  }, [logoFile]);

  // On mount: fetch products + detect existing onboarding state to resume the correct step
  useEffect(() => {
    const init = async () => {
      // 1. Always load products (needed on customize step)
      try {
        const resp = await fetch('/api/subscriptions/products');
        const result = await resp.json();
        if (result.success && result.data) setProducts(result.data);
      } catch (err) {
        console.error('Failed to fetch products', err);
      }

      // 2. Check if the user already has an in-progress workspace
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data: memberRow } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces!inner(id, name, company_id, is_onboarding_finished, companies(heard_about_us))')
          .eq('user_id', session.user.id)
          .eq('status', 'accepted')
          .limit(1)
          .maybeSingle();

        if (!memberRow) return; // Totally new user — stay on 'info'

        const workspace = (memberRow.workspaces as any);
        if (!workspace) return;

        // Workspace exists but onboarding already finished — redirect away
        if (workspace.is_onboarding_finished) {
          router.push(pathsConfig.app.home);
          return;
        }

        // Restore IDs into state so subsequent steps work correctly
        setOnboardingWorkspaceId(workspace.id);
        if (workspace.company_id) setOnboardingCompanyId(workspace.company_id);
        // Pre-fill the workspace name from existing data
        if (workspace.name) setWorkspaceName(workspace.name);

        // Decide which step to resume
        const company = workspace.companies;
        if (workspace.company_id && company?.heard_about_us?.length > 0) {
          // Company created + heard_about_us answered → go to customize
          setStep('customize');
        } else if (workspace.company_id) {
          // Company created but heard_about_us not answered → go to heard
          setStep('heard');
        }
        // else: no company yet → stay on 'info' (default)
      } catch (err) {
        console.error('Failed to check onboarding state:', err);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!workspaceName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!billingCountry) {
      setError('Billing country is required');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Validate Tax ID if provided
      if (taxId.trim()) {
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
          setError(errData.message || 'Tax ID validation failed.');
          setLoading(false);
          return;
        }

        const { data: valResult } = await valResponse.json();
        if (!valResult.isValid) {
          setError(`Tax ID is invalid: ${valResult.message}`);
          setLoading(false);
          return;
        }
      }

      let logo_url = null;

      // Upload logo if selected
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

        logo_url = publicUrlData.publicUrl;
      }

      // Create company
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName,
          billing_country: billingCountry,
          logo_url,
          created_by: user?.id,
          tax_id: taxId.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }

      const { data: companyData } = await response.json();

      // Create the workspace and link it to the newly created company
      const workspaceResponse = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          owner_id: user?.id,
          company_id: companyData.id,
          is_subscribed_for_updates: isSubscribed,
          is_onboarding_finished: false,
        }),
      });

      if (!workspaceResponse.ok) {
        const workspaceError = await workspaceResponse.json();
        throw new Error(workspaceError.message || 'Failed to create workspace');
      }

      const { data: workspaceData } = await workspaceResponse.json();

      // Store IDs in React state for subsequent steps
      setOnboardingCompanyId(companyData.id);
      setOnboardingWorkspaceId(workspaceData.id);

      // Persist the billing country so the Footer reflects it on all subsequent steps
      persistBillingCountry(billingCountry);

      setStep('heard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleHeardSubmit = async (e?: React.FormEvent, skip: boolean = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    if (!skip && onboardingCompanyId) {
      // Build the final array: replace the 'Other' token with the custom text
      // (if filled in), otherwise keep the label as-is.
      const finalHeardAbout = heardAbout
        .map((item) => (item === 'Other' && otherText.trim() ? otherText.trim() : item))
        .filter((item) => item !== 'Other' || otherText.trim()); // drop bare 'Other' if no text

      if (finalHeardAbout.length > 0) {
        try {
          await fetch(`/api/companies/${onboardingCompanyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ heard_about_us: finalHeardAbout }),
          });
        } catch (err) {
          console.error('Failed to update company heard_about_us:', err);
        }
      }
    }

    setLoading(false);
    setStep('customize');
  };


  const handleCustomizeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const workspaceId = onboardingWorkspaceId;

      if (!workspaceId) {
        throw new Error('Workspace ID not found. Please try again.');
      }

      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_preferences: selectedProducts,
          is_onboarding_finished: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update workspace');
      }

      // IMPORTANT: Use setQueryData (not invalidateQueries) for the workspace-check
      // cache. invalidateQueries triggers an async background refetch — during that
      // refetch the old stale data { isOnboardingFinished: false } remains in cache.
      // When /home/sales mounts and useWorkspaceCheck's useEffect fires, it reads the
      // stale value and immediately redirects back to /workspace-setup.
      //
      // setQueryData writes the correct value synchronously into the cache before
      // navigation, so the next page sees is_onboarding_finished = true from the start.
      queryClient.setQueryData(
        ['userHasWorkspace', user?.id],
        { hasWorkspace: true, isOnboardingFinished: true },
      );

      // Invalidate (but don't await) userWorkspaces so RBACProvider refetches fresh
      // workspace data in the background once we land on the next page.
      queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });

      // Map product_key → concrete app route. We always redirect to a specific
      // product page so the user never hits /org/home's initialization loop.
      const productRouteMap: Record<string, string> = {
        sales: '/home/sales',
        hrms: '/home/hrms',
        inventory: '/home/inventory',
        service_cloud: '/home/services',
        funds: '/home/funds',
      };

      const firstSelectedId = selectedProducts[0];
      const firstProduct = products.find(p => p.id === firstSelectedId);
      // Prefer the first selected product route; fall back to the module selector.
      const redirectRoute = firstProduct?.product_key
        ? (productRouteMap[firstProduct.product_key] ?? '/org/home')
        : '/org/home';

      router.push(`${redirectRoute}?welcome=1`);
    } catch (err) {
      console.error(err);
      setError('Failed to update workspace. Please try again.');
      setLoading(false);
    }
  };

  const heardOptions = [
    { label: 'Facebook', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
    { label: 'X.com', icon: 'M4 4l11.733 16h4.267L8.267 4H4zm8.213 10.42L5.8 4h-2.1l7.653 11.84L19.4 20h2.1l-8.087-12.38z' },
    { label: 'Google', icon: 'M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z' },
    { label: 'Billboard / Outside', icon: 'M3 4v16h18V4H3zm16 14H5V6h14v12z M8 9h8v2H8V9z M8 13h6v2H8v-2z' },
    { label: 'Reddit', icon: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.956 12.115c-.48 0-.87-.39-.87-.87 0-.48.39-.87.87-.87.48 0 .87.39.87.87 0 .48-.39.87-.87.87zM12 16.5c-2.32 0-3.956-.992-4.048-1.053-.16-.107-.202-.323-.095-.482.107-.16.323-.202.482-.095.044.028 1.474.88 3.66.88 2.185 0 3.616-.852 3.66-.88.16-.107.376-.065.482.095.107.16.065.376-.095.482-.092.06-1.728 1.053-4.048 1.053zm-3.956-4.385c-.48 0-.87-.39-.87-.87 0-.48.39-.87.87-.87.48 0 .87.39.87.87 0 .48-.39.87-.87.87zM16.14 7.64l-2.61-.555.77-2.316a.42.42 0 00-.253-.522.42.42 0 00-.522.253l-.868 2.61-3.614-.77.868-2.61a.42.42 0 00-.253-.522.42.42 0 00-.522.253l-.77 2.316-2.61-.555a.42.42 0 00-.522.253.42.42 0 00.253.522l2.61.555-.77 2.316a.42.42 0 00.253.522.42.42 0 00.522-.253l.868-2.61 3.614.77-.868 2.61a.42.42 0 00.253.522.42.42 0 00.522-.253l.77-2.316 2.61.555a.42.42 0 00.522-.253.42.42 0 00-.253-.522z' },
    { label: 'AI', icon: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z' },
    { label: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z' },
    { label: 'Newsletter', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Youtube', icon: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' },
    { label: 'Friends / Coworker', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Podcast', icon: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 21v-4' },
    { label: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
    { label: 'Other', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
  ];

  if (step === 'create' || step === 'heard' || step === 'customize' || step === 'final_placeholder') {
    return (
      <>
        <div className="flex min-h-screen bg-white dark:bg-[#111317]">
          {/* Left Preview Side */}
          <div className="hidden lg:block lg:w-1/2 relative bg-[var(--color-leadgaze-primary)] overflow-hidden">
            <DashboardPreview companyName={workspaceName} slug={slug} logoUrl={logoPreviewUrl} />
          </div>

          {/* Right Form Side */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 bg-white dark:bg-[#111317]">
            <div className="w-full max-w-md mx-auto">
              {step === 'create' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="mb-10">
                    <button onClick={() => setStep('info')} className="text-sm font-medium text-slate-500 hover:text-leadgaze-dark flex items-center gap-1.5 mb-8 dark:text-white">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800 mb-2">Create your workspace</h1>
                  </div>

                  <form onSubmit={handleCreateCompany} className="space-y-6">
                    <LogoUploader companyName={workspaceName} onFileSelect={setLogoFile} disabled={loading} />

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-leadgaze-dark dark:text-white">Company name</label>
                        <Input
                          type="text"
                          placeholder="e.g. Acme Corp"
                          value={workspaceName}
                          onChange={(e) => setWorkspaceName(e.target.value)}
                          disabled={loading}
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-leadgaze-dark dark:text-white">Workspace handle</label>

                        <Input
                          type="text"
                          value={slug}
                          readOnly
                          placeholder="workspace-slug"
                        />

                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-leadgaze-dark dark:text-white">Billing country</label>
                        <CountrySelect
                          value={billingCountry}
                          onValueChange={setBillingCountry}
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-leadgaze-dark dark:text-white">Tax ID / TIN (Optional)</label>
                        <Input
                          type="text"
                          placeholder="e.g. 196700197W"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          disabled={loading}
                        />
                        {/* <p className="text-xs text-slate-500 mt-1">
                        This Tax ID will be used for your payments to Leadgaze.
                      </p> */}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg bg-white dark:bg-slate-900 dark:border-slate-800">
                        <Switch
                          id="subscribe"
                          checked={isSubscribed}
                          onCheckedChange={(checked) => setIsSubscribed(checked as boolean)}
                          disabled={loading}
                          className="mt-0.5 data-[state=checked]:bg-[var(--color-leadgaze-primary)]"
                        />
                        <div className="flex-1">
                          <label htmlFor="subscribe" className="text-sm font-medium text-leadgaze-dark dark:text-white cursor-pointer block">
                            Subscribe to product update emails
                          </label>
                          <p className="text-xs text-slate-500 mt-1">
                            Get the latest updates about features and product updates.
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || !workspaceName.trim() || !billingCountry}
                      size="lg"
                      className="w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none rounded-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {step === 'heard' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="mb-8">
                    <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800 mb-2 dark:text-white">How did you hear about us?</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Please select below where you found out about {workspaceName || 'Leadgaze'}. This step is optional.
                    </p>
                  </div>

                  <form onSubmit={handleHeardSubmit} className="space-y-6">
                    <div className="flex flex-wrap gap-2.5">
                      {heardOptions.map((option) => {
                        const isSelected = heardAbout.includes(option.label);
                        return (
                          <Button
                            type="button"
                            key={option.label}
                            onClick={() => {
                              if (isSelected) {
                                setHeardAbout(prev => prev.filter(item => item !== option.label));
                              } else {
                                setHeardAbout(prev => [...prev, option.label]);
                              }
                            }}
                            className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium
                            ${isSelected
                                ? 'bg-[var(--color-leadgaze-primary)] border-[var(--color-leadgaze-primary)] text-white shadow-md'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }
                          `}
                          >
                            <svg className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSelected ? 1 : 2} d={option.icon} stroke={option.label === 'Podcast' || option.label === 'Other' || option.label === 'Friends / Coworker' || option.label === 'Newsletter' ? 'currentColor' : 'none'} />
                            </svg>
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>

                    {heardAbout.includes('Other') && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <Input
                          type="text"
                          placeholder="Please specify..."
                          value={otherText}
                          onChange={(e) => setOtherText(e.target.value)}
                          disabled={loading}
                          required
                          className="border-slate-200 bg-white text-sm text-slate-800 focus-visible:border-[var(--color-leadgaze-primary)] focus-visible:ring-[var(--color-leadgaze-primary)]/20"
                        />
                      </div>
                    )}

                    <div className="pt-6 flex flex-col gap-3">
                      <Button
                        type="submit"
                        disabled={loading}
                        size="lg"
                        className="w-full bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none rounded-lg"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => handleHeardSubmit(undefined, true)}
                        disabled={loading}
                        className="w-full text-sm font-medium rounded-lg"
                      >
                        Skip
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 'customize' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="mb-10">
                    <button onClick={() => setStep('heard')} className="text-sm font-medium text-slate-500 hover:text-leadgaze-dark flex items-center gap-1.5 mb-8 dark:text-white">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      Back
                    </button>
                    <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800 mb-3 dark:text-white">Help us customize your workspace</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Leadgaze is all about empowering you to build the exact CRM you need, no matter how complex.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                      You can easily create workflows for virtually any use case. Tell us about your use case to get started with some templates, or you can start with a blank canvas.
                    </p>
                  </div>

                  <form onSubmit={handleCustomizeSubmit} className="space-y-8">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 block">What will you be using Leadgaze for?</label>
                      <div className="flex flex-wrap gap-2.5">
                        {products.map((product) => {
                          const isSelected = selectedProducts.includes(product.id);
                          return (
                            <Button
                              type="button"
                              key={product.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedProducts(prev => prev.filter(id => id !== product.id));
                                } else {
                                  setSelectedProducts(prev => [...prev, product.id]);
                                }
                              }}
                              className={`
                              px-4 py-2 rounded-full border transition-all duration-200 text-sm font-medium hover:bg-transparent
                              ${isSelected
                                  ? 'bg-white text-slate-800 border-leadgaze-primary shadow-sm dark:bg-slate-800 dark:text-white dark:border-white'
                                  : 'bg-transparent text-slate-600 border-slate-200 dark:text-slate-400 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }
                            `}
                            >
                              {product.display_name}
                            </Button>
                          );
                        })}

                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-4">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={loading || selectedProducts.length === 0}
                        size="lg"
                        className="w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none rounded-lg"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 'final_placeholder' && (
                <div className="space-y-6">
                  <p className="text-slate-600 dark:text-slate-300">All set! Ready for the next form step...</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      {step === 'info' && (
        // ─── Information Step: Full-screen 50/50 split ────────────
        <>
          {/* ── Left Panel: Blue sidebar (50%) ── */}
          <div className="flex-1 min-h-screen bg-[linear-gradient(160deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] flex flex-col px-12 py-16 text-white lg:flex xl:px-16">
            {/* Logo */}
            <div className="mb-12">
              <Image
                src="/images/leadgaze-logo-white.png"
                alt="Leadgaze"
                width={140}
                height={48}
                className="h-9 w-auto brightness-0 invert"
                priority
              />
            </div>

            <div className="mb-10">
              <h1 className="text-[2.5rem] font-bold leading-tight text-white mb-4">
                Welcome to<br />Leadgaze
              </h1>
              <p className="text-base leading-relaxed text-blue-100/80 max-w-sm">
                Your all-in-one platform for Sales, HR, and Service operations. Select your primary workspace to get started.
              </p>
            </div>

            {/* Module list rows */}
            <div className="flex flex-col gap-1 max-w-sm">
              {[
                {
                  icon: TrendingUp,
                  title: 'Sales CRM',
                  desc: 'Leads, deals & pipeline management',
                },
                {
                  icon: Users,
                  title: 'HRMS',
                  desc: 'People, payroll & operations',
                },
                {
                  icon: Headphones,
                  title: 'Service Cloud',
                  desc: 'Tickets, support & resolution',
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.title}>
                    <div className="flex items-center gap-4 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-blue-100/70 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    {idx < 2 && <div className="h-px bg-white/10" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Panel: Features + CTA (50%) ── */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 bg-white dark:bg-[#111317]">
            <div className="w-full max-w-md mx-auto">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Everything you need, unified</h2>
                <p className="text-sm text-slate-500 mt-2">A complete suite designed to scale with your business.</p>
              </div>

              {/* Feature cards */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: TrendingUp,
                    title: 'Sales Pipeline & CRM',
                    desc: 'Track every lead from first contact to close with automated workflows.',
                  },
                  {
                    icon: Users,
                    title: 'HR & Workforce',
                    desc: 'Manage your entire team, leave requests, and performance in one place.',
                  },
                  {
                    icon: Headphones,
                    title: 'Service & Support',
                    desc: 'Provide world-class support with unified ticket management systems.',
                  },
                  {
                    icon: Briefcase,
                    title: 'Role-Based Access & Collaboration',
                    desc: 'Invite your team with granular permissions per module.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 border border-slate-200 bg-white p-4 transition-all hover:border-[var(--color-leadgaze-primary)]/30 hover:shadow-md h-[98px]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-leadgaze-primary)]/8 text-[var(--color-leadgaze-primary)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="mt-8 gap-4 flex flex-col">
                <Button
                  onClick={() => setStep('create')}
                  size="lg"
                  className="w-full gap-2 text-sm font-semibold text-white hover:border-none"
                >
                  Start Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-center text-xs text-slate-400">
                  You can create additional workspaces later in settings
                </p>
              </div>
            </div>
          </div>
          <Footer />
        </>
      )}
    </div>
  );
}
