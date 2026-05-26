import { MenuContainer } from '@/features/cardapio/containers/menu-container';

export default function MenuPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Cardápio</h1>
        <p className="text-sm text-muted-foreground">
          Organize categorias, produtos, fotos, disponibilidade e adicionais.
        </p>
      </header>
      <MenuContainer />
    </div>
  );
}
