import { useEffect, useState } from 'react';
import { Check, ExternalLink, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import type { Product, StoreSettings } from '../data/types';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  product: Product | null;
  settings: StoreSettings;
  onClose: () => void;
  onAddToCart: (product: Product, variant: string, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  settings,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0] || 'Standard');
      setQuantity(1);
      setJustAdded(false);
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [product, onClose]);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart(product, selectedVariant, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/90 border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Close product details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Sticky Visual */}
          <div className="lg:col-span-6 bg-zinc-100 flex items-center justify-center">
            <ResilientImage
              src={product.image}
              alt={product.name}
              fallbackLabel={product.name}
              className="w-full aspect-[4/3] lg:aspect-auto lg:h-full object-cover"
            />
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{product.origin}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{product.sku}</span>
              </div>

              <div>
                <h2
                  id="pdp-title"
                  className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 leading-tight"
                >
                  {product.name}
                </h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
                    {product.priceMad} MAD
                  </span>
                  <span className="text-xs font-medium text-zinc-600">
                    {product.availabilityLabel} ({product.stockCount} available)
                  </span>
                </div>
              </div>

              <p className="text-sm text-zinc-600 leading-relaxed">
                {product.description}
              </p>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-200 text-xs">
                <div>
                  <span className="block text-zinc-500">Dimensions</span>
                  <span className="font-medium text-zinc-900 mt-0.5 block">
                    {product.dimensions}
                  </span>
                </div>
                <div>
                  <span className="block text-zinc-500">Materials</span>
                  <span className="font-medium text-zinc-900 mt-0.5 block">
                    {product.material}
                  </span>
                </div>
              </div>

              {/* Variant Selector */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-zinc-700 mb-2">
                  Edition / Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const active = selectedVariant === variant;
                    return (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer min-h-[40px] ${
                          active
                            ? 'bg-zinc-950 text-white border-zinc-950'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        {variant}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Purchase Actions */}
            <div className="space-y-3 pt-4 border-t border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-zinc-50 h-11">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center font-mono text-sm font-medium tabular-nums text-zinc-950">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(Math.max(1, product.stockCount), q + 1)
                      )
                    }
                    className="w-10 h-full flex items-center justify-center text-zinc-700 hover:text-zinc-950 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 h-11 px-5 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors duration-150 cursor-pointer whitespace-nowrap"
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Bag</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        Add to Bag ·{' '}
                        <span className="font-mono tabular-nums">
                          {product.priceMad * quantity} MAD
                        </span>
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <span>
                  Cash on Delivery in {settings.city} &amp; all Morocco
                </span>
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-zinc-800 hover:text-red-600 transition-colors whitespace-nowrap"
                >
                  <span>Ask on {settings.instagramHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
