import { useState, type ChangeEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { PRESET_IMAGES } from '../data/defaults';
import type {
  AccentColorKey,
  DeliveryZone,
  OrderStatus,
  Product,
  StoreOrder,
  StorePayload,
  StoreSettings,
} from '../data/types';
import { ACCENT_THEMES } from '../utils/accentTheme';
import { compressImageFile } from '../utils/imageUpload';
import { ResilientImage } from './ResilientImage';

export type EditorTab = 'store' | 'products' | 'delivery' | 'orders';

interface OwnerEditorDrawerProps {
  isOpen: boolean;
  activeTab: EditorTab;
  settings: StoreSettings;
  products: Product[];
  deliveryZones: DeliveryZone[];
  orders: StoreOrder[];
  saving: boolean;
  onChangeTab: (tab: EditorTab) => void;
  onClose: () => void;
  onUpdateSettings: (next: StoreSettings) => void;
  onUpdateProducts: (next: Product[]) => void;
  onUpdateDeliveryZones: (next: DeliveryZone[]) => void;
  onOpenProductEditor: (product: Product | null) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onResetDefaults: () => void;
  onImportPayload: (payload: Partial<StorePayload>) => void;
}

export function OwnerEditorDrawer({
  isOpen,
  activeTab,
  settings,
  products,
  deliveryZones,
  orders,
  saving,
  onChangeTab,
  onClose,
  onUpdateSettings,
  onUpdateProducts,
  onUpdateDeliveryZones,
  onOpenProductEditor,
  onUpdateOrderStatus,
  onDeleteOrder,
  onResetDefaults,
  onImportPayload,
}: OwnerEditorDrawerProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [heroUploading, setHeroUploading] = useState(false);

  if (!isOpen) return null;

  const handleHeroUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroUploading(true);
    try {
      const dataUrl = await compressImageFile(file, 1400, 0.85);
      onUpdateSettings({ ...settings, heroImage: dataUrl });
    } finally {
      setHeroUploading(false);
    }
  };

  const handleExportJson = () => {
    const payload = {
      settings,
      products,
      deliveryZones,
      orders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anime-store-ma-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<StorePayload>;
      onImportPayload(parsed);
      setImportStatus('Backup imported successfully.');
      setTimeout(() => setImportStatus(''), 2500);
    } catch {
      setImportStatus('Invalid JSON backup file.');
    }
  };

  const handleAddDeliveryZone = () => {
    const next: DeliveryZone = {
      id: `zone-${Date.now()}`,
      city: 'New City / Zone',
      method: 'Amana / Courier · Cash on Delivery',
      eta: '24–48 Hours',
      feeMad: 35,
    };
    onUpdateDeliveryZones([...deliveryZones, next]);
  };

  const handleDuplicateProduct = (product: Product) => {
    const copy: Product = {
      ...product,
      id: `${product.id}-copy-${Date.now()}`,
      sku: `${product.sku}-2`,
      name: `${product.name} (Copy)`,
    };
    onUpdateProducts([copy, ...products]);
  };

  const handleMoveProduct = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= products.length) return;
    const copy = [...products];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onUpdateProducts(copy);
  };

  const handleUpdatePillar = (
    index: number,
    field: 'title' | 'subtitle',
    value: string
  ) => {
    const nextPillars = settings.trustPillars.map((pillar, i) =>
      i === index ? { ...pillar, [field]: value } : pillar
    );
    onUpdateSettings({ ...settings, trustPillars: nextPillars });
  };

  const tabs: { id: EditorTab; label: string }[] = [
    { id: 'store', label: 'Store & Hero' },
    { id: 'products', label: `Products (${products.length})` },
    { id: 'delivery', label: `Delivery (${deliveryZones.length})` },
    { id: 'orders', label: `Orders (${orders.length})` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Store Owner Editor"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full flex flex-col border-l border-zinc-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-950">
              Store Editor
            </h2>
            <p className="text-xs text-zinc-500">
              {saving
                ? 'Saving changes...'
                : 'Edit every section, product, price, and color live.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-zinc-600 hover:bg-zinc-100 cursor-pointer"
            aria-label="Close store editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-6 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-200/70 rounded-xl">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`flex-1 min-w-[110px] px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* TAB 1: STORE & HERO */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Store Brand Name
                  </label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        brandName: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, city: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={settings.instagramHandle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        instagramHandle: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        instagramUrl: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    WhatsApp Number (Optional, e.g. +2126...)
                  </label>
                  <input
                    type="tel"
                    value={settings.whatsappNumber}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        whatsappNumber: e.target.value,
                      })
                    }
                    placeholder="+212 6..."
                    className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Owner Editor PIN
                  </label>
                  <input
                    type="text"
                    value={settings.ownerPin}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        ownerPin: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
              </div>

              {/* Accent Color Theme */}
              <div className="pt-4 border-t border-zinc-200 space-y-2.5">
                <label className="block text-xs font-semibold text-zinc-900">
                  Store Accent Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ACCENT_THEMES) as AccentColorKey[]).map(
                    (key) => {
                      const theme = ACCENT_THEMES[key];
                      const active = settings.accentColor === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({ ...settings, accentColor: key })
                          }
                          className={`inline-flex items-center gap-2 px-3 h-9 rounded-lg border text-xs font-medium cursor-pointer ${
                            active
                              ? 'border-zinc-950 bg-zinc-100 text-zinc-950'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: theme.swatchHex }}
                          />
                          <span>{theme.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Announcement */}
              <div className="pt-4 border-t border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-900">
                    Top Announcement Bar
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showAnnouncement}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          showAnnouncement: e.target.checked,
                        })
                      }
                    />
                    <span>Show bar</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.announcementText}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      announcementText: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                />
              </div>

              {/* Hero Section */}
              <div className="pt-4 border-t border-zinc-200 space-y-4">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  Hero Banner
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Hero Kicker Line
                    </label>
                    <input
                      type="text"
                      value={settings.heroKicker}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          heroKicker: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Primary Button Label
                    </label>
                    <input
                      type="text"
                      value={settings.heroCtaText}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          heroCtaText: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={settings.heroTitle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        heroTitle: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Hero Description
                  </label>
                  <textarea
                    rows={3}
                    value={settings.heroDescription}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        heroDescription: e.target.value,
                      })
                    }
                    className="w-full p-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>

                {/* Hero Photo */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 aspect-[16/10] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100">
                    <ResilientImage
                      src={settings.heroImage}
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="sm:col-span-7 space-y-2.5">
                    <label className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer">
                      <ImagePlus className="w-4 h-4" />
                      <span>
                        {heroUploading ? 'Uploading...' : 'Upload Hero Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroUpload}
                        className="sr-only"
                      />
                    </label>
                    <input
                      type="text"
                      value={settings.heroImage}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          heroImage: e.target.value,
                        })
                      }
                      placeholder="Image URL"
                      className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-zinc-300 bg-white"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_IMAGES.slice(0, 3).map((p) => (
                        <button
                          key={p.url}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({ ...settings, heroImage: p.url })
                          }
                          className="px-2 py-1 text-[11px] rounded border border-zinc-200 hover:border-zinc-400 text-zinc-600 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Trust Pillars */}
              <div className="pt-4 border-t border-zinc-200 space-y-3">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  4 Store Guarantees (Below Hero)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {settings.trustPillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2"
                    >
                      <input
                        type="text"
                        value={pillar.title}
                        onChange={(e) =>
                          handleUpdatePillar(idx, 'title', e.target.value)
                        }
                        placeholder={`Guarantee ${idx + 1} title`}
                        className="w-full h-8 px-2.5 text-xs font-semibold rounded-md border border-zinc-300 bg-white"
                      />
                      <input
                        type="text"
                        value={pillar.subtitle}
                        onChange={(e) =>
                          handleUpdatePillar(idx, 'subtitle', e.target.value)
                        }
                        placeholder={`Guarantee ${idx + 1} subtitle`}
                        className="w-full h-8 px-2.5 text-xs rounded-md border border-zinc-300 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Catalog Headings */}
              <div className="pt-4 border-t border-zinc-200 space-y-3">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  Catalog Section Headings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Catalog Kicker
                    </label>
                    <input
                      type="text"
                      value={settings.catalogKicker}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          catalogKicker: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Catalog Heading
                    </label>
                    <input
                      type="text"
                      value={settings.catalogTitle}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          catalogTitle: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* About, Footer & Free Shipping Thresholds */}
              <div className="pt-4 border-t border-zinc-200 space-y-4">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  About Section, Footer &amp; Free Shipping Rules
                </h3>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    About Kicker
                  </label>
                  <input
                    type="text"
                    value={settings.aboutKicker}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        aboutKicker: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    About Heading
                  </label>
                  <input
                    type="text"
                    value={settings.aboutTitle}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        aboutTitle: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    About Paragraph 1
                  </label>
                  <textarea
                    rows={2}
                    value={settings.aboutParagraph1}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        aboutParagraph1: e.target.value,
                      })
                    }
                    className="w-full p-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    About Paragraph 2
                  </label>
                  <textarea
                    rows={2}
                    value={settings.aboutParagraph2}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        aboutParagraph2: e.target.value,
                      })
                    }
                    className="w-full p-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Footer Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.footerTagline}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        footerTagline: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Free {settings.city} Delivery Above (MAD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={settings.freeKenitraThreshold}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          freeKenitraThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Free Morocco Delivery Above (MAD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={settings.freeNationalThreshold}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          freeNationalThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 text-sm font-mono rounded-lg border border-zinc-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-600">
                  Quick-edit prices &amp; stock, reorder cards, or open full
                  product editor.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenProductEditor(null)}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    className="p-4 bg-white space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <ResilientImage
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-12 rounded-lg object-cover border border-zinc-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-950 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {product.category} · {product.sku}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveProduct(index, -1)}
                          className="w-8 h-8 rounded-lg border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 inline-flex items-center justify-center text-zinc-600 cursor-pointer"
                          aria-label={`Move ${product.name} up`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === products.length - 1}
                          onClick={() => handleMoveProduct(index, 1)}
                          className="w-8 h-8 rounded-lg border border-zinc-200 hover:border-zinc-400 disabled:opacity-40 inline-flex items-center justify-center text-zinc-600 cursor-pointer"
                          aria-label={`Move ${product.name} down`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenProductEditor(product)}
                          className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-zinc-200 hover:border-zinc-400 text-xs font-medium text-zinc-800 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(product)}
                          className="px-2.5 h-8 rounded-lg border border-zinc-200 hover:border-zinc-400 text-xs font-medium text-zinc-700 cursor-pointer"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProducts(
                              products.filter((p) => p.id !== product.id)
                            )
                          }
                          className="w-8 h-8 rounded-lg border border-zinc-200 hover:border-red-300 hover:text-red-600 inline-flex items-center justify-center text-zinc-500 cursor-pointer"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Inline Price & Stock Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-100">
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <span className="shrink-0">Price:</span>
                        <input
                          type="number"
                          min={0}
                          value={product.priceMad}
                          onChange={(e) =>
                            onUpdateProducts(
                              products.map((p) =>
                                p.id === product.id
                                  ? {
                                      ...p,
                                      priceMad: Math.max(
                                        0,
                                        Number(e.target.value) || 0
                                      ),
                                    }
                                  : p
                              )
                            )
                          }
                          className="w-full h-8 px-2 font-mono text-xs rounded border border-zinc-300 bg-zinc-50 text-zinc-950"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <span className="shrink-0">Stock:</span>
                        <input
                          type="number"
                          min={0}
                          value={product.stockCount}
                          onChange={(e) =>
                            onUpdateProducts(
                              products.map((p) =>
                                p.id === product.id
                                  ? {
                                      ...p,
                                      stockCount: Math.max(
                                        0,
                                        Number(e.target.value) || 0
                                      ),
                                    }
                                  : p
                              )
                            )
                          }
                          className="w-full h-8 px-2 font-mono text-xs rounded border border-zinc-300 bg-zinc-50 text-zinc-950"
                        />
                      </label>
                      <input
                        type="text"
                        value={product.availabilityLabel}
                        onChange={(e) =>
                          onUpdateProducts(
                            products.map((p) =>
                              p.id === product.id
                                ? { ...p, availabilityLabel: e.target.value }
                                : p
                            )
                          )
                        }
                        placeholder="Status label"
                        className="col-span-2 sm:col-span-1 h-8 px-2 text-xs rounded border border-zinc-300 bg-zinc-50 text-zinc-950"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY ZONES */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-600">
                  Configure Moroccan cities, couriers, ETAs, and Cash on
                  Delivery fees.
                </p>
                <button
                  type="button"
                  onClick={handleAddDeliveryZone}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-zinc-950 hover:bg-red-600 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add City Zone</span>
                </button>
              </div>

              <div className="space-y-3">
                {deliveryZones.map((zone, idx) => (
                  <div
                    key={zone.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-700">
                        Zone {idx + 1}
                      </span>
                      {deliveryZones.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDeliveryZones(
                              deliveryZones.filter((z) => z.id !== zone.id)
                            )
                          }
                          className="text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={zone.city}
                        onChange={(e) =>
                          onUpdateDeliveryZones(
                            deliveryZones.map((z) =>
                              z.id === zone.id
                                ? { ...z, city: e.target.value }
                                : z
                            )
                          )
                        }
                        placeholder="City / Zone Name"
                        className="h-9 px-3 text-xs rounded-lg border border-zinc-300 bg-white"
                      />
                      <input
                        type="text"
                        value={zone.method}
                        onChange={(e) =>
                          onUpdateDeliveryZones(
                            deliveryZones.map((z) =>
                              z.id === zone.id
                                ? { ...z, method: e.target.value }
                                : z
                            )
                          )
                        }
                        placeholder="Delivery Method"
                        className="h-9 px-3 text-xs rounded-lg border border-zinc-300 bg-white"
                      />
                      <input
                        type="text"
                        value={zone.eta}
                        onChange={(e) =>
                          onUpdateDeliveryZones(
                            deliveryZones.map((z) =>
                              z.id === zone.id
                                ? { ...z, eta: e.target.value }
                                : z
                            )
                          )
                        }
                        placeholder="ETA (e.g. Same Day)"
                        className="h-9 px-3 text-xs rounded-lg border border-zinc-300 bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={zone.feeMad}
                          onChange={(e) =>
                            onUpdateDeliveryZones(
                              deliveryZones.map((z) =>
                                z.id === zone.id
                                  ? { ...z, feeMad: Number(e.target.value) }
                                  : z
                              )
                            )
                          }
                          className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-zinc-300 bg-white"
                        />
                        <span className="text-xs font-mono text-zinc-600 shrink-0">
                          MAD
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS & BACKUP */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  Incoming Cash on Delivery Orders
                </h3>

                {orders.length === 0 ? (
                  <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50 text-center text-xs text-zinc-500">
                    No customer orders placed yet. Orders submitted in the Bag
                    drawer will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.orderId}
                        className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-zinc-950">
                              #{order.orderId}
                            </span>
                            <span className="mx-2 text-zinc-300">·</span>
                            <span className="text-xs font-semibold text-zinc-900">
                              {order.customerName}
                            </span>
                            <span className="mx-2 text-zinc-300">·</span>
                            <span className="font-mono text-xs text-zinc-600">
                              {order.phone}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                onUpdateOrderStatus(
                                  order.orderId,
                                  e.target.value as OrderStatus
                                )
                              }
                              className="h-8 px-2.5 text-xs rounded-lg border border-zinc-300 bg-zinc-50 font-medium"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => onDeleteOrder(order.orderId)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                              aria-label={`Delete order ${order.orderId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-600">
                          {order.cityLabel} — {order.address}
                          {order.instagramHandle
                            ? ` · IG: ${order.instagramHandle}`
                            : ''}
                        </p>

                        <ul className="text-xs text-zinc-700 space-y-1 pt-2 border-t border-zinc-100">
                          {order.items.map((item) => (
                            <li
                              key={item.key}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {item.quantity}x {item.name} ({item.variant})
                              </span>
                              <span className="font-mono tabular-nums">
                                {item.priceMad * item.quantity} MAD
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex justify-between text-xs font-bold text-zinc-950 pt-2 border-t border-zinc-100">
                          <span>Total COD</span>
                          <span className="font-mono tabular-nums">
                            {order.totalMad} MAD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Backup / Import / Reset */}
              <div className="pt-5 border-t border-zinc-200 space-y-3">
                <h3 className="font-display text-sm font-bold text-zinc-950">
                  Backup &amp; Reset
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup JSON</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Backup JSON</span>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={handleImportJson}
                      className="sr-only"
                    />
                  </label>

                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Default Store</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onResetDefaults();
                          setConfirmReset(false);
                        }}
                        className="px-3.5 h-9 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="px-3 h-9 rounded-lg border border-zinc-200 text-xs text-zinc-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {importStatus && (
                  <p className="text-xs text-zinc-700">{importStatus}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
