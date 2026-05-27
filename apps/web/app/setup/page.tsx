import { redirect } from 'next/navigation';

import { SetupWizard } from '@/components/setup/setup-wizard';
import { getCurrentOrganization } from '@/lib/server-api';

export default async function SetupPage() {
  const org = await getCurrentOrganization();
  if (!org) redirect('/login');

  return (
    <SetupWizard
      initial={{
        name: org.data.name,
        slug: org.data.slug,
        logo: org.data.logo,
        addressLine: org.data.addressLine,
        phone: org.data.phone,
        deliveryEnabled: org.data.deliveryEnabled,
        deliverySchedule: org.data.deliverySchedule,
      }}
    />
  );
}
