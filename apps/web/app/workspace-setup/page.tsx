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

import pathsConfig from '~/config/paths.config';
// eslint-disable-line @typescript-eslint/no-unused-vars
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { data: user, isPending: _isPending } = useUser();
  const queryClient = useQueryClient();

  const [workspaceName, setWorkspaceName] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
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
  const [step, setStep] = useState<'info' | 'create' | 'heard' | 'customize' | 'final_placeholder'>('customize');

  const slug = workspaceName.toLowerCase().replace(/[\s0-9]+/g, '-').replace(/[^a-z-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
    }
  }, [logoFile]);

  // Fetch products immediately when user lands
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/subscriptions/products');
        const result = await response.json();
        if (result.success && result.data) {
          setProducts(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch products', err);
      }
    };
    fetchProducts();
  }, []);

  const { hasWorkspace, isLoading: isCheckLoading } = useWorkspaceCheck();

  // If user already has a workspace, redirect to home
  useEffect(() => {
    if (hasWorkspace === true && !isCheckLoading) {
      router.push(pathsConfig.app.home);
    }
  }, [hasWorkspace, isCheckLoading, router]);

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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create company');
      }

      const { data: companyData } = await response.json();
      
      // Navigate to next step
      // Store companyId and isSubscribed somewhere if needed for final workspace creation
      (window as any)._onboardingCompanyId = companyData.id;
      (window as any)._onboardingIsSubscribed = isSubscribed;
      (window as any)._onboardingCompanyName = workspaceName;
      
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

    if (!skip) {
      const companyId = (window as any)._onboardingCompanyId;
      const finalHeardAbout = [...heardAbout];
      if (heardAbout.includes('Other') && otherText.trim()) {
        // Find index of 'Other' and replace it with the custom text or just append it
        // We will just append the custom text and remove 'Other' from DB storage for cleaner data,
        // or keep both. Let's filter out 'Other' and add the custom text.
        const filtered = finalHeardAbout.filter(item => item !== 'Other');
        filtered.push(otherText.trim());
        
        if (companyId && filtered.length > 0) {
          try {
            await fetch(`/api/companies/${companyId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ heard_about_us: filtered }),
            });
          } catch (err) {
            console.error('Failed to update company:', err);
          }
        }
      } else if (companyId && finalHeardAbout.length > 0) {
         try {
            await fetch(`/api/companies/${companyId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ heard_about_us: finalHeardAbout }),
            });
          } catch (err) {
            console.error('Failed to update company:', err);
          }
      }
    }

    setLoading(false);
    setStep('customize');
  };

  const handleCustomizeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    // Will be handled when user asks for final creation
    setLoading(false);
    setStep('final_placeholder');
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
                    className="h-12 w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none rounded-lg"
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
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4 py-12">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-leadgaze-primary)] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-leadgaze-primary)] opacity-[0.04] blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-leadgaze-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-leadgaze-primary) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-[28rem]">
        {/* Logo & Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Image
            src="/images/lead-gaze-logo-main-screen.png"
            alt="Leadgaze"
            width={180}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </div>

        {step === 'info' && (
          // ─── Information Step ─────────────────────────────────
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
            {/* Hero */}
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] shadow-[var(--color-leadgaze-primary)]/20 shadow-lg">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800">
                Welcome to Leadgaze
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Your all-in-one platform for Sales, HR, and Service operations.
                Create a workspace to get started.
              </p>
            </div>

            {/* Module cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: TrendingUp,
                  title: 'Sales\nCRM',
                  desc: 'Leads, deals & pipeline',
                },
                {
                  icon: Users,
                  title: 'HRMS',
                  desc: 'People & operations',
                },
                {
                  icon: Headphones,
                  title: 'Service\nCloud',
                  desc: 'Tickets & support',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-[var(--color-leadgaze-primary)]/20 hover:shadow-md"
                  >
                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-leadgaze-primary)]/8 text-[var(--color-leadgaze-primary)] transition-colors group-hover:bg-[var(--color-leadgaze-primary)]/12">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs leading-tight font-medium whitespace-pre-line text-leadgaze-dark dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-white">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Benefits list */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Everything you need, unified
              </h3>
              <div className="space-y-3">
                {[
                  {
                    title: 'Sales Pipeline & CRM',
                    desc: 'Manage leads, contacts, and close deals faster',
                  },
                  {
                    title: 'HR & Workforce Management',
                    desc: 'Onboard employees, track leave, and manage teams',
                  },
                  {
                    title: 'Service & Support Cloud',
                    desc: 'Handle tickets, SLAs, and customer support',
                  },
                  {
                    title: 'Role-Based Access & Collaboration',
                    desc: 'Invite your team with granular permissions per module',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-leadgaze-dark dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-white">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => setStep('create')}
              size="lg"
              className="h-12 w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl"
            >
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-slate-400">
              You can create additional workspaces later in settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
