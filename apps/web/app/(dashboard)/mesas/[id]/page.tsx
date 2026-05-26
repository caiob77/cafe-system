import { MesaDetailContainer } from '@/features/mesas/containers/mesa-detail-container';

type Params = { id: string };

export default function MesaDetailPage({ params }: { params: Params }) {
  return <MesaDetailContainer tableId={params.id} />;
}
