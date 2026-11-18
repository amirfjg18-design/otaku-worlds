import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { PRESET_IMAGES } from '../data/defaults';
import type { Product } from '../data/types';
import { compressImageFile } from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

interface ProductEditorModalProps {
  isOpen: boolean;
  product: Product | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: (product: Product) => void;
}

function createEmptyProduct(): Product {
  const num = Math.floor(100 + Math.random() * 899);
  return {
    id: `item-${Date.now()}`,
    sku: `ASM-NEW-${num}`,
    name: '',
    category: 'Anime Figures',
    origin: 'Kenitra Stock',
    priceMad: 250,
    image: PRESET_IMAGES[1].url,
    shortDesc: '',
    description: '',
    variants: ['Standard'],
    dimensions: '20 cm',
    material: 'PVC / ABS',
    stockCount: 5,
    availabilityLabel: 'In Stock · Kenitra',
  };
}

export function ProductEditorModal({
  isOpen,
  product,
  existingCategories,
  onClose,
  onSave,
}: ProductEditorModalProps) {
  const [draft, setDraft] = useState<Product>(createEmptyProduct());
  const [variantsText, setVariantsText] = useState('Standard');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial = product ? { ...product } : createEmptyProduct();
      setDraft(initial);
      setVariantsText((initial.variants || ['Standard']).join(', '));
      setUploadError('');
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const dataUrl = await compressImageFile(file);
      setDraft((prev) => ({ ...prev, image: dataUrl }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to process image'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedVariants = variantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      ...draft,
      name: draft.name.trim() || 'Untitled Product',
      category: draft.category.trim() || 'Anime Figures',
      origin: draft.origin.trim() || 'Kenitra Stock',
      priceMad: Math.max(0, Number(draft.priceMad) || 0),
      stockCount: Math.max(0, Number(draft.stockCount) || 0),
      variants: parsedVariants.length > 0 ? parsedVariants : ['Standard'],
      shortDesc:
        draft.shortDesc.trim() ||
        'Curated item ready for pickup or Cash on Delivery across Morocco.',
      description:
        draft.description.trim() ||
        draft.shortDesc.trim() ||
        'Inspected in Kenitra before shipment across Morocco.',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[2px] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-editor-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl border border-zinc-200 shadow-xl my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2
            id="product-editor-title"
            className="font-display text-lg font-bold text-zinc-950"
          >
            {product ? `Edit Product — ${product.name}` : 'Add New Product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 cursor-pointer"
            aria-label="Close product editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
        >
          {/* Image Preview + Upload / Preset Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-5 aspect-[4/3] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100">
              <ResilientImage
                src={draft.image}
                alt={draft.name || 'Product preview'}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="sm:col-span-7 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Upload Photo from Device
                </label>
                <label className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  <span>{uploading ? 'Processing...' : 'Choose Image File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="sr-only"
                  />
                </label>
                {uploadError && (
                  <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="prod-image-url"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Or Paste Image URL / Choose Studio Preset
                </label>
                <input
                  id="prod-image-url"
                  type="text"
                  value={draft.image}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, image: e.target.value }))
                  }
                  placeholder="https://... or /src/assets/..."
                  className="w-full h-9 px-3 text-xs rounded-lg border border-zinc-300 bg-white text-zinc-950 font-mono"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, image: preset.url }))
                      }
                      className="px-2 py-1 text-[11px] rounded border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Core Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prod-name"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Product Name
              </label>
              <input
                id="prod-name"
                type="text"
                required
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Gojo Satoru Figure 25cm"
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>

            <div>
              <label
                htmlFor="prod-price"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Price (MAD)
              </label>
              <input
                id="prod-price"
                type="number"
                min={0}
                required
                value={draft.priceMad}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    priceMad: Number(e.target.value),
                  }))
                }
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>

            <div>
              <label
                htmlFor="prod-category"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Category
              </label>
              <input
                id="prod-category"
                type="text"
                list="category-suggestions"
                required
                value={draft.category}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
              <datalist id="category-suggestions">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="prod-origin"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Origin / Edition Label
              </label>
              <input
                id="prod-origin"
                type="text"
                value={draft.origin}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, origin: e.target.value }))
                }
                placeholder="e.g. Shenzhen Direct / Tokyo Studio"
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>

            <div>
              <label
                htmlFor="prod-sku"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                SKU Code
              </label>
              <input
                id="prod-sku"
                type="text"
                value={draft.sku}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, sku: e.target.value }))
                }
                className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="prod-stock"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Stock Qty
                </label>
                <input
                  id="prod-stock"
                  type="number"
                  min={0}
                  value={draft.stockCount}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      stockCount: Number(e.target.value),
                    }))
                  }
                  className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white text-zinc-950"
                />
              </div>

              <div>
                <label
                  htmlFor="prod-status"
                  className="block text-xs font-medium text-zinc-700 mb-1"
                >
                  Availability Text
                </label>
                <input
                  id="prod-status"
                  type="text"
                  value={draft.availabilityLabel}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      availabilityLabel: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3 text-xs rounded-lg border border-zinc-300 bg-white text-zinc-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="prod-dimensions"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Dimensions / Fit
              </label>
              <input
                id="prod-dimensions"
                type="text"
                value={draft.dimensions}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, dimensions: e.target.value }))
                }
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>

            <div>
              <label
                htmlFor="prod-material"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Material
              </label>
              <input
                id="prod-material"
                type="text"
                value={draft.material}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, material: e.target.value }))
                }
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prod-variants"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Sizes / Editions (comma-separated)
            </label>
            <input
              id="prod-variants"
              type="text"
              value={variantsText}
              onChange={(e) => setVariantsText(e.target.value)}
              placeholder="e.g. Size M, Size L, Size XL"
              className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
            />
          </div>

          <div>
            <label
              htmlFor="prod-short"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Short Card Summary (1–2 lines)
            </label>
            <input
              id="prod-short"
              type="text"
              value={draft.shortDesc}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, shortDesc: e.target.value }))
              }
              placeholder="Brief summary shown on the catalog card"
              className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
            />
          </div>

          <div>
            <label
              htmlFor="prod-desc"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Full Description
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Detailed description shown when customers click the item"
              className="w-full p-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
            />
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
            >
              {product ? 'Save Changes' : 'Add Product to Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
