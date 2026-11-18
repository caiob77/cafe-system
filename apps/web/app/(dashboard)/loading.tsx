import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4 sm:gap-6">
      <span className="sr-only">Carregando…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders estáticos
          <Skeleton className="h-28 rounded-lg" key={index} />
        ))}
      </div>
    </div>
  );
}
