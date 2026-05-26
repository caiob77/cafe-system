'use client';

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Category } from '@/features/cardapio/types';

type CategoryListProps = {
  categories: Category[];
  selectedId: string | null;
  loading: boolean;
  canManage: boolean;
  productCountByCategory: Record<string, number>;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onReorder: (orderedIds: string[]) => void;
};

export function CategoryList({
  categories,
  selectedId,
  loading,
  canManage,
  productCountByCategory,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onReorder,
}: CategoryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(categories, oldIndex, newIndex).map((c) => c.id);
    onReorder(next);
  }

  return (
    <aside className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Categorias</h2>
          <p className="text-xs text-muted-foreground">
            {categories.length} {categories.length === 1 ? 'seção' : 'seções'}
          </p>
        </div>
        {canManage ? (
          <Button onClick={onCreate} size="sm" type="button" variant="secondary">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : categories.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Nenhuma categoria ainda.
          {canManage ? (
            <Button onClick={onCreate} size="sm" type="button" variant="default">
              Criar primeira categoria
            </Button>
          ) : null}
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext
            disabled={!canManage}
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1.5">
              {categories.map((category) => (
                <SortableCategoryItem
                  canManage={canManage}
                  category={category}
                  key={category.id}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onSelect={onSelect}
                  productCount={productCountByCategory[category.id] ?? 0}
                  selected={selectedId === category.id}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </aside>
  );
}

type SortableCategoryItemProps = {
  category: Category;
  selected: boolean;
  canManage: boolean;
  productCount: number;
  onSelect: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

function SortableCategoryItem({
  category,
  selected,
  canManage,
  productCount,
  onSelect,
  onEdit,
  onDelete,
}: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      className={cn(
        'group flex items-center gap-1 rounded-md border bg-card pr-1 transition-colors',
        selected ? 'border-primary bg-primary/10' : 'hover:border-primary/50',
        isDragging && 'opacity-50',
      )}
      ref={setNodeRef}
      style={style}
    >
      {canManage ? (
        <button
          aria-label="Arrastar para reordenar"
          className="flex h-10 w-7 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <span className="w-2" />
      )}

      <button
        className="flex flex-1 items-center justify-between gap-2 py-2 pr-1 text-left text-sm font-medium"
        onClick={() => onSelect(category.id)}
        type="button"
      >
        <span className="truncate">{category.name}</span>
        <Badge variant={selected ? 'default' : 'muted'}>{productCount}</Badge>
      </button>

      {canManage ? (
        <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            aria-label={`Editar ${category.name}`}
            onClick={() => onEdit(category)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label={`Remover ${category.name}`}
            onClick={() => onDelete(category)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}
