import { Settings } from 'lucide-react';

import { SectionPage } from '@/components/layout/section-page';

export default function SettingsPage() {
  return (
    <SectionPage
      description="Dados do café e preferências."
      icon={Settings}
      title="Configurações"
    />
  );
}
