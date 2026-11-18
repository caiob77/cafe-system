import { MenuContainer } from '@/features/cardapio/containers/menu-container';

export default function MenuPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cardápio</h1>
        <p className="text-sm text-muted-foreground">
          Organize categorias, produtos, fotos, disponibilidade e adicionais.
        </p>
      </header>
      <MenuContainer />
    </div>
  );
}
