import Link from 'next/link';

import {
  ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
  Building2 as Building2Icon,
  LayoutDashboard as LayoutDashboardIcon,
  LayoutGrid as LayoutGridIcon,
  ShieldCheck as ShieldCheckIcon,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

import { LiveDashboardPreview } from './_components/live-dashboard-preview';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'New'}>
              <span>The next-generation CRM for modern businesses</span>
            </Pill>
          }
          title={
            <>
              <span>Enterprise-Grade CRM</span>
              <span>with Salesforce-style Workflows</span>
            </>
          }
          subtitle={
            <span>
              LeadGaze combines Salesforce's proven CRM workflows with modern
              SaaS power. Manage leads, close deals, and scale your business
              with complete customizability.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={<LiveDashboardPreview />}
        />
      </div>

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-col space-y-16 xl:space-y-32 2xl:space-y-36'}
        >
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold dark:text-white">
                  Built for Sales Excellence
                </b>
                .{' '}
                <span className="text-muted-foreground font-normal">
                  LeadGaze provides all the tools you need to manage your entire
                  sales cycle from first contact to closed won.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <LayoutDashboardIcon className="h-5" />
                <span>Modern CRM Engine</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={
                  'relative col-span-2 overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-950'
                }
                label={'Leads & Pipeline'}
                description={`Visual Kanban boards and custom qualification stages to keep your sales team moving fast.`}
                icon={<LayoutGridIcon className="h-6 w-6" />}
              >
                <div className="mt-6 flex gap-2">
                  <div className="h-24 w-1/3 rounded-xl border border-blue-200 bg-white/50 p-3 dark:border-blue-800 dark:bg-black/20">
                    <div className="mb-2 h-1 w-8 rounded-full bg-blue-500" />
                    <div className="h-1.5 w-full rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="h-24 w-1/3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-black/10">
                    <div className="mb-2 h-1 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <div className="h-1.5 w-full rounded bg-gray-100 opacity-50 dark:bg-gray-800" />
                  </div>
                  <div className="h-24 w-1/3 rounded-xl border border-blue-200 bg-white/50 p-3 dark:border-blue-800 dark:bg-black/20">
                    <div className="mb-2 h-1 w-8 rounded-full bg-blue-500" />
                    <div className="h-1.5 w-full rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className={
                  'relative col-span-2 w-full overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-white lg:col-span-1 dark:from-purple-950/20 dark:to-gray-950'
                }
                label={'Opportunity Tracking'}
                description={`Interactive deal timelines and revenue forecasting powered by Salesforce-inspired logic.`}
                icon={<TrendingUpIcon className="h-6 w-6" />}
              >
                <div className="mt-6 space-y-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full w-[75%] bg-gradient-to-r from-purple-500 to-pink-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      PROJECTED: +24%
                    </span>
                    <ArrowUpRightIcon className="h-3 w-3 text-purple-500" />
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className={
                  'relative col-span-2 overflow-hidden border-green-500/20 bg-gradient-to-br from-green-50/50 to-white lg:col-span-1 dark:from-green-950/20 dark:to-gray-950'
                }
                label={'Granular RBAC'}
                description={`Enterprise-grade permissions control access at the record level (Own, Team, or All).`}
                icon={<ShieldCheckIcon className="h-6 w-6" />}
              >
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="border-green-500/30 bg-green-500/10 text-[9px] text-green-600"
                  >
                    Admin
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-blue-500/10 text-[9px] text-blue-600"
                  >
                    Manager
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-gray-500/30 bg-gray-500/10 text-[9px] text-gray-600"
                  >
                    Standard
                  </Badge>
                </div>
              </FeatureCard>

              <FeatureCard
                className={
                  'relative col-span-2 overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-gray-950'
                }
                label={'Account Relations'}
                description={`Manage complex organizational hierarchies and key stakeholders in one centralized view.`}
                icon={<Building2Icon className="h-6 w-6" />}
              >
                <div className="mt-6 flex items-center justify-center">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[10px] font-bold dark:border-gray-900 dark:bg-gray-800"
                      >
                        U{i}
                      </div>
                    ))}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[10px] font-bold text-white shadow-lg dark:border-gray-900">
                      +12
                    </div>
                  </div>
                </div>
              </FeatureCard>
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-0.5'}>
            <span>
              <Trans i18nKey={'common:getStarted'} />
            </span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'}>
        <Link href={'/contact'}>
          <Trans i18nKey={'common:contactUs'} />
        </Link>
      </CtaButton>
    </div>
  );
}
