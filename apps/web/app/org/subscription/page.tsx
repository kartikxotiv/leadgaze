import { SubscriptionManagementPage } from '~/components/subscriptions/subscription-management-page';

export default function OrgSubscriptionPage() {
  return <SubscriptionManagementPage />;
}

export function LegacyOrgSubscriptionPage(
  _props: { canManageSubscription?: boolean } = {},
) {
  return <SubscriptionManagementPage />;
}
