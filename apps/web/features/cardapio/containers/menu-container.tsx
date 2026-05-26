'use client';

import { useEffect, useMemo, useState } from 'react';

import { CategoryFormDialog } from '@/components/cardapio/category-form-dialog';
import { CategoryList } from '@/components/cardapio/category-list';
import { ProductFormDialog } from '@/components/cardapio/product-form-dialog';
import { ProductGrid } from '@/components/cardapio/product-grid';
import { ApiError } from '@/lib/api-client';

import { useSessionUI } from '@/features/auth/context/session-ui-provider';
import { useProductAddons } from '@/features/cardapio/api/use-addons';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from '@/features/cardapio/api/use-categories';
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
  useUpdateProductAvailability,
} from '@/features/cardapio/api/use-products';
import type { Category, Product } from '@/features/cardapio/types';

const MANAGE_ROLES = new Set(['owner', 'manager']);

export function MenuContainer() {
  const session = useSessionUI();
  const role = session.role;
  const canManage = role !== null && MANAGE_ROLES.has(role);
  const canToggleAvailability = canManage || role === 'attendant';

  const categoriesQuery = useCategories();
  const productsQuery = useProducts();
  const reorderCategories = useReorderCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateAvailability = useUpdateProductAvailability();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; target: Category | null }>({
    open: false,
    target: null,
  });
  const [productDialog, setProductDialog] = useState<{ open: boolean; target: Product | null }>({
    open: false,
    target: null,
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.active),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (visibleCategories.length === 0) {
      if (selectedCategoryId !== null) setSelectedCategoryId(null);
      return;
    }
    const stillExists = visibleCategories.some((c) => c.id === selectedCategoryId);
    if (!stillExists) {
      const first = visibleCategories[0];
      if (first) setSelectedCategoryId(first.id);
    }
  }, [visibleCategories, selectedCategoryId]);

  const products = productsQuery.data ?? [];
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      const bucket = map[p.categoryId] ?? [];
      bucket.push(p);
      map[p.categoryId] = bucket;
    }
    return map;
  }, [products]);

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const selectedCategory = useMemo(
    () => visibleCategories.find((c) => c.id === selectedCategoryId) ?? null,
    [visibleCategories, selectedCategoryId],
  );

  const productsForSelected = selectedCategoryId
    ? (productsByCategory[selectedCategoryId] ?? [])
    : [];

  const productDialogTargetId = productDialog.target?.id ?? null;
  const addonsQuery = useProductAddons(productDialogTargetId);

  function handleReorderCategories(orderedIds: string[]) {
    reorderCategories.mutate(orderedIds);
  }

  function openCreateCategory() {
    setCategoryError(null);
    setCategoryDialog({ open: true, target: null });
  }

  function openEditCategory(category: Category) {
    setCategoryError(null);
    setCategoryDialog({ open: true, target: category });
  }

  async function handleCategorySubmit(input: { name: string }) {
    setCategoryError(null);
    try {
      if (categoryDialog.target) {
        await updateCategory.mutateAsync({ id: categoryDialog.target.id, ...input });
      } else {
        const created = await createCategory.mutateAsync(input);
        setSelectedCategoryId(created.id);
      }
      setCategoryDialog({ open: false, target: null });
    } catch (err) {
      setCategoryError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    }
  }

  async function handleDeleteCategory(category: Category) {
    const ok = window.confirm(`Remover a categoria "${category.name}"?`);
    if (!ok) return;
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Não foi possível remover.');
    }
  }

  function openCreateProduct() {
    setProductError(null);
    setProductDialog({ open: true, target: null });
  }

  function openEditProduct(product: Product) {
    setProductError(null);
    setProductDialog({ open: true, target: product });
  }

  async function handleProductSubmit(input: Parameters<typeof createProduct.mutateAsync>[0]) {
    setProductError(null);
    try {
      if (productDialog.target) {
        const updated = await updateProduct.mutateAsync({
          id: productDialog.target.id,
          ...input,
        });
        setProductDialog({ open: true, target: updated });
        return updated;
      }
      const created = await createProduct.mutateAsync(input);
      setSelectedCategoryId(created.categoryId);
      setProductDialog({ open: true, target: created });
      return created;
    } catch (err) {
      setProductError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    }
  }

  async function handleDeleteProduct(product: Product) {
    const ok = window.confirm(`Remover o produto "${product.name}"?`);
    if (!ok) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Não foi possível remover.');
    }
  }

  function handleToggleAvailability(product: Product, available: boolean) {
    updateAvailability.mutate({ id: product.id, available });
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 lg:max-w-xs">
        <CategoryList
          canManage={canManage}
          categories={visibleCategories}
          loading={categoriesQuery.isLoading}
          onCreate={openCreateCategory}
          onDelete={handleDeleteCategory}
          onEdit={openEditCategory}
          onReorder={handleReorderCategories}
          onSelect={setSelectedCategoryId}
          productCountByCategory={productCountByCategory}
          selectedId={selectedCategoryId}
        />
      </div>

      <div className="flex-1">
        <ProductGrid
          canManage={canManage}
          canToggleAvailability={canToggleAvailability}
          category={selectedCategory}
          loading={productsQuery.isLoading}
          onCreate={openCreateProduct}
          onDelete={handleDeleteProduct}
          onEdit={openEditProduct}
          onToggleAvailability={handleToggleAvailability}
          products={productsForSelected}
          togglingId={
            updateAvailability.isPending ? (updateAvailability.variables?.id ?? null) : null
          }
        />
      </div>

      <CategoryFormDialog
        category={categoryDialog.target}
        error={categoryError}
        loading={createCategory.isPending || updateCategory.isPending}
        onOpenChange={(open) =>
          setCategoryDialog((prev) => ({ open, target: open ? prev.target : null }))
        }
        onSubmit={handleCategorySubmit}
        open={categoryDialog.open}
      />

      <ProductFormDialog
        addons={addonsQuery.data ?? []}
        categories={visibleCategories}
        defaultCategoryId={selectedCategoryId}
        error={productError}
        loading={createProduct.isPending || updateProduct.isPending}
        onOpenChange={(open) =>
          setProductDialog((prev) => ({ open, target: open ? prev.target : null }))
        }
        onSubmit={handleProductSubmit}
        open={productDialog.open}
        product={productDialog.target}
      />
    </div>
  );
}
