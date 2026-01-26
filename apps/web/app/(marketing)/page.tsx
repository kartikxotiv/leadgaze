import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, LayoutDashboard } from 'lucide-react';

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
              LeadGaze combines Salesforce's proven CRM workflows with modern SaaS power.
              Manage leads, close deals, and scale your business with complete customizability.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <Image
              priority
              className={
                'dark:border-primary/10 rounded-2xl border border-gray-200'
              }
              width={3558}
              height={2222}
              src={`/images/dashboard.webp`}
              alt={`App Image`}
            />
          }
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
                  LeadGaze provides all the tools you need to manage your entire sales cycle
                  from first contact to closed won.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <LayoutDashboard className="h-5" />
                <span>Modern CRM Engine</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Leads & Pipeline'}
                description={`Visual Kanban boards and custom qualification stages to keep your sales team moving fast.`}
              />

              <FeatureCard
                className={
                  'relative col-span-2 w-full overflow-hidden lg:col-span-1'
                }
                label={'Opportunity Tracking'}
                description={`Interactive deal timelines and revenue forecasting powered by Salesforce-inspired logic.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden lg:col-span-1'}
                label={'Granular RBAC'}
                description={`Enterprise-grade permissions control access at the record level (Own, Team, or All).`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Account Relations'}
                description={`Manage complex organizational hierarchies and key stakeholders in one centralized view.`}
              />
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
