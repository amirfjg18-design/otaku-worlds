import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { Navbar } from './components/Navbar';
import {
  OwnerEditorDrawer,
  type EditorTab,
} from './components/OwnerEditorDrawer';
import { PinUnlockModal } from './components/PinUnlockModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProductEditorModal } from './components/ProductEditorModal';
import { ResilientImage } from './components/ResilientImage';
import { DEFAULT_STORE_PAYLOAD } from './data/defaults';
import type {
  DeliveryZone,
  OrderStatus,
  Product,
  StoreOrder,
  StorePayload,
  StoreSettings,
} from './data/types';
import { ADMIN_EMAIL, auth } from './firebase';
import {
  createOrderInFirestore,
  deleteOrderInFirestore,
  deleteProductFromFirestore,
  saveProductToFirestore,
  saveStoreConfigToFirestore,
  seedInitialStoreIfEmpty,
  subscribeAdminOrders,
  subscribeAdminPin,
  subscribePublicStore,
  syncAllProductsToFirestore,
  syncDeliveryZonesToFirestore,
  updateOrderStatusInFirestore,
} from './services/storeFirestore';
import { getAccentTheme } from './utils/accentTheme';

type SortOption = 'featured' | 'price-asc' | 'price-desc';
const STORAGE_KEY = 'anime_store_ma_cache_v1';

function loadCachedStore(): StorePayload {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE_PAYLOAD;
    const parsed = JSON.parse(raw) as Partial<StorePayload>;
    return {
      settings: {
        ...DEFAULT_STORE_PAYLOAD.settings,
        ...(parsed.settings ?? {}),
      },
      products: Array.isArray(parsed.products)
        ? parsed.products
        : DEFAULT_STORE_PAYLOAD.products,
      deliveryZones: Array.isArray(parsed.deliveryZones)
        ? parsed.deliveryZones
        : DEFAULT_STORE_PAYLOAD.deliveryZones,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return DEFAULT_STORE_PAYLOAD;
  }
}

export default function App() {
  const initialStore = useMemo(() => loadCachedStore(), []);

  const [settings, setSettings] = useState<StoreSettings>(
    initialStore.settings
  );
  const accent = getAccentTheme(settings.accentColor);
  const [products, setProducts] = useState<Product[]>(initialStore.products);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(
    initialStore.deliveryZones
  );
  const [orders, setOrders] = useState<StoreOrder[]>(initialStore.orders);
  const [saving, setSaving] = useState(false);

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const seededRef = useRef(false);

  // Storefront browsing state
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Owner in-site editing state
  const [editMode, setEditMode] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [editorDrawerOpen, setEditorDrawerOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('store');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);

  const isVerifiedAdmin =
    authReady &&
    Boolean(currentUser) &&
    currentUser?.emailVerified === true &&
    currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to public Firestore storefront collections (live for all visitors)
  useEffect(() => {
    const unsub = subscribePublicStore(
      (remoteConfig) => {
        if (!remoteConfig) return;
        setSettings((prev) => ({
          ...DEFAULT_STORE_PAYLOAD.settings,
          ...remoteConfig,
          ownerPin: prev.ownerPin,
        }));
      },
      (remoteProducts) => {
        if (!remoteProducts) return;
        setProducts(remoteProducts);
      },
      (remoteZones) => {
        if (!remoteZones) return;
        setDeliveryZones(remoteZones);
      }
    );
    return () => unsub();
  }, []);

  // Cache storefront locally for fast initial paint
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: { ...settings, ownerPin: '1110' },
          products,
          deliveryZones,
          orders: [],
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [settings, products, deliveryZones]);

  // Seed Firestore once if empty when owner signs in + attach admin-only listeners
  useEffect(() => {
    if (!isVerifiedAdmin) {
      setOrders([]);
      return;
    }

    if (!seededRef.current) {
      seededRef.current = true;
      void seedInitialStoreIfEmpty(
        DEFAULT_STORE_PAYLOAD.settings,
        DEFAULT_STORE_PAYLOAD.products,
        DEFAULT_STORE_PAYLOAD.deliveryZones
      );
    }

    const unsubOrders = subscribeAdminOrders((remoteOrders) => {
      setOrders(remoteOrders);
    });
    const unsubPin = subscribeAdminPin((remotePin) => {
      setSettings((prev) => ({ ...prev, ownerPin: remotePin }));
    });

    return () => {
      unsubOrders();
      unsubPin();
    };
  }, [isVerifiedAdmin]);

  const handleUpdateSettings = async (next: StoreSettings) => {
    setSettings(next);
    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await saveStoreConfigToFirestore(next);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProducts = async (next: Product[]) => {
    setProducts(next);
    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await syncAllProductsToFirestore(next);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDeliveryZones = async (next: DeliveryZone[]) => {
    setDeliveryZones(next);
    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await syncDeliveryZonesToFirestore(next);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSingleProduct = async (saved: Product) => {
    const existingIndex = products.findIndex((p) => p.id === saved.id);
    const nextProducts =
      existingIndex >= 0
        ? products.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...products];
    setProducts(nextProducts);
    setProductEditorOpen(false);
    setEditingProduct(null);

    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      if (existingIndex >= 0) {
        await saveProductToFirestore(saved, existingIndex);
      } else {
        await syncAllProductsToFirestore(nextProducts);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const nextProducts = products.filter((p) => p.id !== productId);
    setProducts(nextProducts);
    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await deleteProductFromFirestore(productId);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSettings(DEFAULT_STORE_PAYLOAD.settings);
    setProducts(DEFAULT_STORE_PAYLOAD.products);
    setDeliveryZones(DEFAULT_STORE_PAYLOAD.deliveryZones);
    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await saveStoreConfigToFirestore(DEFAULT_STORE_PAYLOAD.settings);
      await syncAllProductsToFirestore(DEFAULT_STORE_PAYLOAD.products);
      await syncDeliveryZonesToFirestore(DEFAULT_STORE_PAYLOAD.deliveryZones);
    } finally {
      setSaving(false);
    }
  };

  const handleImportPayload = async (imported: Partial<StorePayload>) => {
    const nextSettings = imported.settings
      ? { ...DEFAULT_STORE_PAYLOAD.settings, ...imported.settings }
      : settings;
    const nextProducts = Array.isArray(imported.products)
      ? imported.products
      : products;
    const nextZones = Array.isArray(imported.deliveryZones)
      ? imported.deliveryZones
      : deliveryZones;

    setSettings(nextSettings);
    setProducts(nextProducts);
    setDeliveryZones(nextZones);

    if (!isVerifiedAdmin) return;
    setSaving(true);
    try {
      await saveStoreConfigToFirestore(nextSettings);
      await syncAllProductsToFirestore(nextProducts);
      await syncDeliveryZonesToFirestore(nextZones);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitOrder = async (order: StoreOrder) => {
    await createOrderInFirestore(order);
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status } : o))
    );
    if (!isVerifiedAdmin) return;
    await updateOrderStatusInFirestore(orderId, status);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    if (!isVerifiedAdmin) return;
    await deleteOrderInFirestore(orderId);
  };

  const openEditorTab = (tab: EditorTab) => {
    setEditorTab(tab);
    setEditorDrawerOpen(true);
  };

  const handleToggleEditMode = () => {
    if (editMode) {
      setEditMode(false);
      setEditorDrawerOpen(false);
    } else {
      setPinModalOpen(true);
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...unique];
  }, [products]);

  const totalBagCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const filteredProducts = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCategory =
        activeCategory === 'All' || p.category === activeCategory;
      const matchesQuery =
        !queryText ||
        p.name.toLowerCase().includes(queryText) ||
        p.category.toLowerCase().includes(queryText) ||
        p.origin.toLowerCase().includes(queryText) ||
        p.shortDesc.toLowerCase().includes(queryText);
      return matchesCategory && matchesQuery;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.priceMad - b.priceMad);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.priceMad - a.priceMad);
    }
    return list;
  }, [products, activeCategory, searchQuery, sortBy]);

  const handleNavigateSection = (
    sectionId: string,
    categoryFilter?: string
  ) => {
    if (categoryFilter) {
      setActiveCategory(categoryFilter);
    }
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddToCart = (
    product: Product,
    variant: string,
    quantity: number
  ) => {
    const key = `${product.id}__${variant}`;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          variant,
          priceMad: product.priceMad,
          image: product.image,
          quantity,
        },
      ];
    });

    setRecentlyAddedId(product.id);
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === product.id ? null : curr));
    }, 1400);
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-950">
      {/* Slim Dismissible Announcement Bar (<= 36px, non-sticky) */}
      {settings.showAnnouncement && !bannerDismissed && (
        <div className="bg-zinc-950 text-zinc-100 h-9 px-4 flex items-center justify-center relative text-xs">
          <p className="truncate pr-8">
            {settings.announcementText}
            <span className="mx-2 text-zinc-500" aria-hidden="true">
              ·
            </span>
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-red-400 transition-colors"
            >
              {settings.instagramHandle}
            </a>
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Navigation */}
      <Navbar
        brandName={settings.brandName}
        instagramUrl={settings.instagramUrl}
        instagramHandle={settings.instagramHandle}
        cartCount={totalBagCount}
        onOpenCart={() => setCartOpen(true)}
        onNavigateSection={handleNavigateSection}
      />

      {/* Active Owner Edit Workspace Bar (only rendered when Edit Mode is unlocked) */}
      {editMode && (
        <div className="bg-zinc-900 text-white border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-white">
                Store Edit Mode (Live Cloud Sync)
              </span>
              <span className="text-zinc-400">
                {saving
                  ? 'Saving to cloud...'
                  : 'All edits publish live for every visitor'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openEditorTab('store')}
                className="px-3 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
              >
                Edit Store &amp; Hero
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductEditorOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
              <button
                type="button"
                onClick={() => openEditorTab('delivery')}
                className="px-3 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
              >
                Delivery Rates
              </button>
              <button
                type="button"
                onClick={() => openEditorTab('orders')}
                className="px-3 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
              >
                Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-3 h-8 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer whitespace-nowrap"
              >
                Done Editing
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Section 1: Storefront Hero + Full-Width 4-Column Guarantee Strip */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              {/* Left Editorial Copy */}
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-zinc-500">
                    {settings.heroKicker}
                  </span>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => openEditorTab('store')}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-xs font-medium text-zinc-800 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Hero</span>
                    </button>
                  )}
                </div>

                <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.08] text-balance max-w-xl">
                  {settings.heroTitle}
                </h1>

                <p className="text-base text-zinc-600 leading-relaxed max-w-lg">
                  {settings.heroDescription}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleNavigateSection('catalog', 'All')}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[44px] ${accent.primaryButton}`}
                  >
                    <span>{settings.heroCtaText || 'Browse Catalog'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 text-zinc-900 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <span>Follow {settings.instagramHandle}</span>
                    <ExternalLink className="w-4 h-4 text-zinc-500" />
                  </a>
                </div>
              </div>

              {/* Right 16:9 / Full-Height Balanced Showcase */}
              <div className="lg:col-span-6">
                <div className="h-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
                  <ResilientImage
                    src={settings.heroImage}
                    alt={`${settings.brandName} curated shelf in ${settings.city}`}
                    fallbackLabel={`${settings.brandName} — ${settings.city}`}
                    className="w-full aspect-[16/10] lg:aspect-auto lg:h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Trust & Logistics Strip below Hero */}
            <div className="mt-12 pt-8 border-t border-zinc-200">
              {editMode && (
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => openEditorTab('store')}
                    className="inline-flex items-center gap-1 px-2.5 h-7 rounded border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Guarantees</span>
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {settings.trustPillars.map((pillar, index) => (
                  <div key={index}>
                    <p className="text-sm font-semibold text-zinc-950">
                      {pillar.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {pillar.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Featured Collection & Interactive Catalog */}
        <section
          id="catalog"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1.5">
                {settings.catalogKicker}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
                {settings.catalogTitle}
              </h2>
            </div>

            {/* Search, Sort & Owner Editor Workspace Trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search figures, tea sets, hoodies..."
                  aria-label="Search products"
                  className="w-full sm:w-60 h-10 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-950 placeholder:text-zinc-400"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="h-10 px-3 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-800 cursor-pointer"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>

              <button
                type="button"
                onClick={handleToggleEditMode}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  editMode
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{editMode ? 'Editing Site' : 'Edit Site'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div
              role="tablist"
              aria-label="Product categories"
              className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 rounded-xl w-fit border border-zinc-200/70"
            >
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[36px] ${
                      isActive
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductEditorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            )}
          </div>

          {/* 3-Column Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3">
              <p className="font-display text-lg font-semibold text-zinc-900">
                No matching items in this view
              </p>
              <p className="text-sm text-zinc-500">
                Try clearing your search or switching back to all categories, or
                DM {settings.instagramHandle} for custom sourcing from China.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                className="mt-2 inline-flex items-center px-4 py-2 rounded-lg bg-zinc-950 text-white text-xs font-medium hover:bg-red-600 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const isAdded = recentlyAddedId === product.id;
                const defaultVariant = product.variants[0] || 'Standard';

                return (
                  <article
                    key={product.id}
                    className="group bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* 4:3 Uniform Studio Photography */}
                    <button
                      type="button"
                      onClick={() =>
                        editMode
                          ? (setEditingProduct(product),
                            setProductEditorOpen(true))
                          : setSelectedProduct(product)
                      }
                      className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden text-left cursor-pointer"
                      aria-label={
                        editMode
                          ? `Edit ${product.name}`
                          : `View details for ${product.name}`
                      }
                    >
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        fallbackLabel={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </button>

                    {/* Uniform Card Metadata & Purchase Row */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{product.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.origin}</span>
                        </div>

                        <h3 className="font-display text-base font-semibold text-zinc-950 leading-snug">
                          <button
                            type="button"
                            onClick={() =>
                              editMode
                                ? (setEditingProduct(product),
                                  setProductEditorOpen(true))
                                : setSelectedProduct(product)
                            }
                            className="text-left hover:text-red-600 transition-colors cursor-pointer"
                          >
                            {product.name}
                          </button>
                        </h3>

                        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                          {product.shortDesc}
                        </p>
                      </div>

                      {editMode ? (
                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <span className="font-mono text-[15px] font-semibold tabular-nums text-zinc-950">
                            {product.priceMad} MAD
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductEditorOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-900 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="w-9 h-9 rounded-lg border border-zinc-200 hover:border-red-300 hover:text-red-600 inline-flex items-center justify-center text-zinc-500 cursor-pointer"
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-mono text-[15px] font-semibold tabular-nums text-zinc-950 block">
                              {product.priceMad} MAD
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {product.availabilityLabel}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleAddToCart(product, defaultVariant, 1)
                            }
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                              isAdded
                                ? 'bg-emerald-700 text-white'
                                : `bg-zinc-950 ${accent.hoverBg} text-white`
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Bag</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Kenitra Studio & Nationwide Morocco Delivery Matrix */}
        <section
          id="delivery"
          className="border-t border-zinc-200 bg-white py-14 lg:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Left Story & Direct Sourcing */}
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-500">
                    {settings.aboutKicker}
                  </p>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => openEditorTab('store')}
                      className="inline-flex items-center gap-1 px-2.5 h-7 rounded border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Text</span>
                    </button>
                  )}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight text-balance">
                  {settings.aboutTitle}
                </h2>
                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                  {settings.aboutParagraph1}
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {settings.aboutParagraph2}
                </p>

                <div className="pt-2">
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-950 hover:bg-red-600 text-white text-sm font-medium transition-colors duration-150 whitespace-nowrap"
                  >
                    <span>Message {settings.instagramHandle}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Right Morocco COD Tariff Table */}
              <div className="lg:col-span-7 bg-[#FAFAFA] rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-zinc-950">
                      Morocco Delivery &amp; Cash on Delivery Rates
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Free in {settings.city} from{' '}
                      {settings.freeKenitraThreshold} MAD · Free nationwide from{' '}
                      {settings.freeNationalThreshold} MAD
                    </p>
                  </div>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => openEditorTab('delivery')}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-zinc-300 bg-white text-xs font-medium text-zinc-800 hover:bg-zinc-50 cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Rates</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs text-zinc-500 bg-zinc-100/60">
                        <th className="py-3 px-6 font-medium">Destination</th>
                        <th className="py-3 px-4 font-medium">Method</th>
                        <th className="py-3 px-4 font-medium">Timing</th>
                        <th className="py-3 px-6 font-medium text-right">
                          Fee
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {deliveryZones.map((zone) => (
                        <tr key={zone.id}>
                          <td className="py-3.5 px-6 font-medium text-zinc-950">
                            {zone.city}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-zinc-600">
                            {zone.method}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-zinc-700 whitespace-nowrap">
                            {zone.eta}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono text-xs font-semibold tabular-nums text-zinc-950 whitespace-nowrap">
                            {zone.feeMad === 0 ? 'Free' : `${zone.feeMad} MAD`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-zinc-200 bg-[#FAFAFA] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-bold text-zinc-950">
              {settings.brandName}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {settings.footerTagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-600">
            <button
              type="button"
              onClick={() => handleNavigateSection('catalog', 'All')}
              className="hover:text-zinc-950 cursor-pointer"
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => handleNavigateSection('delivery')}
              className="hover:text-zinc-950 cursor-pointer"
            >
              Delivery Rates
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="hover:text-zinc-950 cursor-pointer"
            >
              Bag ({totalBagCount})
            </button>
            <button
              type="button"
              onClick={handleToggleEditMode}
              className="hover:text-zinc-950 cursor-pointer"
            >
              {editMode ? 'Exit Edit Mode' : 'Owner Edit Mode'}
            </button>
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${accent.textAccent} inline-flex items-center gap-1`}
            >
              <span>{settings.instagramHandle}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        settings={settings}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Slide-Over Cart & COD Checkout Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        items={cartItems}
        settings={settings}
        deliveryZones={deliveryZones}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onSubmitOrder={handleSubmitOrder}
      />

      {/* Owner Auth & PIN Unlock Modal */}
      <PinUnlockModal
        isOpen={pinModalOpen}
        expectedPin={settings.ownerPin}
        currentUser={currentUser}
        onClose={() => setPinModalOpen(false)}
        onUnlocked={() => {
          setPinModalOpen(false);
          setEditMode(true);
          setEditorDrawerOpen(true);
          setEditorTab('products');
        }}
      />

      {/* Owner Store Editor Drawer */}
      <OwnerEditorDrawer
        isOpen={editorDrawerOpen}
        activeTab={editorTab}
        settings={settings}
        products={products}
        deliveryZones={deliveryZones}
        orders={orders}
        saving={saving}
        onChangeTab={setEditorTab}
        onClose={() => setEditorDrawerOpen(false)}
        onUpdateSettings={(next) => {
          void handleUpdateSettings(next);
        }}
        onUpdateProducts={(next) => {
          void handleUpdateProducts(next);
        }}
        onUpdateDeliveryZones={(next) => {
          void handleUpdateDeliveryZones(next);
        }}
        onOpenProductEditor={(prod) => {
          setEditingProduct(prod);
          setProductEditorOpen(true);
        }}
        onUpdateOrderStatus={(id, status) => {
          void handleUpdateOrderStatus(id, status);
        }}
        onDeleteOrder={(id) => {
          void handleDeleteOrder(id);
        }}
        onResetDefaults={() => {
          void handleResetDefaults();
        }}
        onImportPayload={(payload) => {
          void handleImportPayload(payload);
        }}
      />

      {/* Add / Edit Single Product Modal */}
      <ProductEditorModal
        isOpen={productEditorOpen}
        product={editingProduct}
        existingCategories={categories.filter((c) => c !== 'All')}
        onClose={() => {
          setProductEditorOpen(false);
          setEditingProduct(null);
        }}
        onSave={(saved) => {
          void handleSaveSingleProduct(saved);
        }}
      />
    </div>
  );
}
