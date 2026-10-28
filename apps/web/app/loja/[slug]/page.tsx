import { PublicStoreContainer } from '@/features/public-store/containers/public-store-container';

type PublicStorePageProps = {
  params: { slug: string };
};

export default function PublicStorePage({ params }: PublicStorePageProps) {
  return <PublicStoreContainer slug={params.slug} />;
}
