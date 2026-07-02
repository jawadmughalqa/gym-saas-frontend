import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Archive, RotateCcw, AlertTriangle,
  Package, Loader2, ChevronDown, X, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import {
  listProducts, createProduct, updateProduct, archiveProduct, restoreProduct,
  type Product, type ProductCategory,
} from '@/api/pos.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'supplements', label: 'Supplements' },
  { value: 'drinks',      label: 'Drinks' },
  { value: 'apparel',     label: 'Apparel' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'equipment',   label: 'Equipment' },
  { value: 'other',       label: 'Other' },
];

// ─── Category dropdown (pure JS) ─────────────────────────────────────────────

function CategorySelect({
  value, onChange, placeholder = 'Select category',
}: { value: string; onChange: (v: ProductCategory) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find(c => c.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => { onChange(c.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${c.value === value ? 'font-medium' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product form modal ───────────────────────────────────────────────────────

interface ProductFormValues {
  name:              string;
  description:       string;
  category:          ProductCategory;
  price:             string;
  stock:             string;
  lowStockThreshold: string;
}

const defaultValues = (): ProductFormValues => ({
  name: '', description: '', category: 'other',
  price: '', stock: '0', lowStockThreshold: '5',
});

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormValues>(
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          category: product.category,
          price: String(product.price),
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
        }
      : defaultValues(),
  );

  const createMut = useMutation({ mutationFn: createProduct });
  const updateMut = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => updateProduct(id, payload) });
  const isPending  = createMut.isPending || updateMut.isPending;

  const field = (k: keyof ProductFormValues, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { toast({ title: 'Invalid price', variant: 'destructive' }); return; }

    const payload = {
      name:              form.name.trim(),
      description:       form.description.trim() || undefined,
      category:          form.category,
      price,
      stock:             parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
    };

    try {
      if (product) {
        await updateMut.mutateAsync({ id: product._id, payload });
        toast({ title: 'Product updated' });
      } else {
        await createMut.mutateAsync(payload as any);
        toast({ title: 'Product created' });
      }
      onSaved();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message ?? 'Something went wrong', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">{product ? 'Edit Product' : 'Add Product'}</h2>
            <button onClick={onClose}><X className="h-5 w-5" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => field('name', e.target.value)} placeholder="e.g. Whey Protein 1kg" />
            </div>

            <div className="space-y-1.5">
              <Label>Category *</Label>
              <CategorySelect value={form.category} onChange={v => field('category', v)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price *</Label>
                <Input type="number" min={0} step="0.01" value={form.price} onChange={e => field('price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" min={0} value={form.stock} onChange={e => field('stock', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Low stock alert threshold</Label>
              <Input type="number" min={0} value={form.lowStockThreshold} onChange={e => field('lowStockThreshold', e.target.value)} placeholder="5" />
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => field('description', e.target.value)} placeholder="Short description" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {product ? 'Save changes' : 'Add product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { toast }   = useToast();
  const qc          = useQueryClient();
  const { currencySymbol }  = useTenantCurrency();

  const [showArchived, setShowArchived]   = useState(false);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [search, setSearch]               = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [showModal, setShowModal]         = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['pos-products', showArchived],
    queryFn:  () => listProducts({ archived: showArchived }),
  });

  const archiveMut = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      toast({ title: 'Product archived' });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
    },
    onError: () => toast({ title: 'Failed to archive', variant: 'destructive' }),
  });

  const restoreMut = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      toast({ title: 'Product restored' });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
    },
    onError: () => toast({ title: 'Failed to restore', variant: 'destructive' }),
  });

  const openAdd  = () => { setEditingProduct(undefined); setShowModal(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingProduct(undefined); };
  const onSaved  = () => { closeModal(); qc.invalidateQueries({ queryKey: ['pos-products'] }); };

  const filtered = products.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your POS product catalog</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {[{ value: 'all', label: 'All' } as const, ...CATEGORIES].map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                activeCategory === cat.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-accent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowArchived(p => !p)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'border-border hover:bg-accent'}`}
        >
          {showArchived ? 'Showing archived' : 'Show archived'}
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-xl">
          <Package className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">{showArchived ? 'No archived products' : 'No products yet'}</p>
          {!showArchived && (
            <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openAdd}>
              <Plus className="h-3 w-3" /> Add your first product
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Price</th>
                <th className="text-right px-4 py-3 font-medium">Stock</th>
                <th className="text-right px-4 py-3 font-medium w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isLowStock = !p.archivedAt && p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p._id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${p.archivedAt ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-muted-foreground">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {currencySymbol}{p.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                        <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>{p.stock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.archivedAt ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => restoreMut.mutate(p._id)}
                            disabled={restoreMut.isPending}
                          >
                            <RotateCcw className="h-3 w-3" /> Restore
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => archiveMut.mutate(p._id)}
                              disabled={archiveMut.isPending}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Low stock summary */}
      {!showArchived && products.filter(p => !p.archivedAt && p.stock <= p.lowStockThreshold).length > 0 && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {products.filter(p => !p.archivedAt && p.stock <= p.lowStockThreshold).length} product(s) running low on stock
        </div>
      )}

      {showModal && (
        <ProductModal product={editingProduct} onClose={closeModal} onSaved={onSaved} />
      )}
    </div>
  );
}
