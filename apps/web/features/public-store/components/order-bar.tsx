import { itemCountLabel } from '../cart';

type OrderBarProps = {
  count: number;
  totalLabel: string;
  detail: string | null;
  onOpen: () => void;
};

export function OrderBar({ count, totalLabel, detail, onOpen }: OrderBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-primary text-primary-foreground lg:hidden">
      <div className="flex items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="min-w-0">
          <p className="text-sm">{itemCountLabel(count)}</p>
          <p className="font-display text-[1.75rem] font-semibold leading-none tabular-nums">
            {totalLabel}
          </p>
          {detail ? <p className="mt-1 text-sm">{detail}</p> : null}
        </div>
        <button
          className="ml-auto inline-flex h-12 shrink-0 items-center bg-primary-foreground px-4 text-base font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          onClick={onOpen}
          type="button"
        >
          Ver pedido
        </button>
      </div>
    </div>
  );
}
