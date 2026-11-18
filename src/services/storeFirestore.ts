import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { DEFAULT_STORE_PAYLOAD } from '../data/defaults';
import type {
  DeliveryZone,
  OrderStatus,
  Product,
  StoreOrder,
  StoreSettings,
} from '../data/types';
import { OperationType, db, handleFirestoreError } from '../firebase';

const STORE_DOC_PATH = 'store/config';
const STORE_PRIVATE_PATH = 'storePrivate/settings';
const PRODUCTS_PATH = 'products';
const ZONES_PATH = 'deliveryZones';
const ORDERS_PATH = 'orders';

function clampStr(val: string | undefined, maxLen: number): string {
  return String(val ?? '').slice(0, maxLen);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

function buildStoreConfigPayload(settings: StoreSettings) {
  const pillars =
    settings.trustPillars && settings.trustPillars.length > 0
      ? settings.trustPillars.slice(0, 8).map((p) => ({
          title: clampStr(p.title, 80),
          subtitle: clampStr(p.subtitle, 160),
        }))
      : DEFAULT_STORE_PAYLOAD.settings.trustPillars;

  return {
    brandName: clampStr(settings.brandName || 'ANIME STORE MA', 80),
    announcementText: clampStr(settings.announcementText, 200),
    showAnnouncement: Boolean(settings.showAnnouncement),
    instagramHandle: clampStr(settings.instagramHandle, 60),
    instagramUrl: clampStr(settings.instagramUrl, 250),
    whatsappNumber: clampStr(settings.whatsappNumber, 30),
    city: clampStr(settings.city || 'Kenitra', 60),
    accentColor: settings.accentColor || 'crimson',
    heroKicker: clampStr(settings.heroKicker, 120),
    heroTitle: clampStr(settings.heroTitle || 'Anime Collectibles', 160),
    heroDescription: clampStr(settings.heroDescription, 600),
    heroCtaText: clampStr(settings.heroCtaText || 'Browse Catalog', 60),
    heroImage: clampStr(settings.heroImage, 450000),
    catalogKicker: clampStr(settings.catalogKicker, 120),
    catalogTitle: clampStr(settings.catalogTitle || 'Catalog', 120),
    aboutKicker: clampStr(settings.aboutKicker, 120),
    aboutTitle: clampStr(settings.aboutTitle || 'About Us', 160),
    aboutParagraph1: clampStr(settings.aboutParagraph1, 800),
    aboutParagraph2: clampStr(settings.aboutParagraph2, 800),
    footerTagline: clampStr(settings.footerTagline, 200),
    freeKenitraThreshold: Math.max(
      0,
      Math.min(100000, Number(settings.freeKenitraThreshold) || 0)
    ),
    freeNationalThreshold: Math.max(
      0,
      Math.min(100000, Number(settings.freeNationalThreshold) || 0)
    ),
    trustPillars: pillars,
    updatedAt: serverTimestamp(),
  };
}

function buildProductPayload(product: Product, sortOrder: number) {
  const safeId = sanitizeId(product.id);
  const safeVariants =
    Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants.slice(0, 20).map((v) => clampStr(v, 80))
      : ['Standard'];

  return {
    id: safeId,
    sku: clampStr(product.sku, 40),
    name: clampStr(product.name || 'Product', 160),
    category: clampStr(product.category || 'Anime Figures', 60),
    origin: clampStr(product.origin, 80),
    priceMad: Math.max(0, Math.min(1000000, Number(product.priceMad) || 0)),
    image: clampStr(product.image, 450000),
    shortDesc: clampStr(product.shortDesc, 300),
    description: clampStr(product.description, 2000),
    variants: safeVariants,
    dimensions: clampStr(product.dimensions, 100),
    material: clampStr(product.material, 120),
    stockCount: Math.max(
      0,
      Math.min(100000, Math.round(Number(product.stockCount) || 0))
    ),
    availabilityLabel: clampStr(product.availabilityLabel, 80),
    sortOrder: Math.max(0, Math.min(100000, Math.round(sortOrder))),
    updatedAt: serverTimestamp(),
  };
}

function buildDeliveryZonePayload(zone: DeliveryZone, sortOrder: number) {
  const safeId = sanitizeId(zone.id);
  return {
    id: safeId,
    city: clampStr(zone.city || 'Morocco', 120),
    method: clampStr(zone.method, 140),
    eta: clampStr(zone.eta, 60),
    feeMad: Math.max(0, Math.min(50000, Number(zone.feeMad) || 0)),
    sortOrder: Math.max(0, Math.min(10000, Math.round(sortOrder))),
  };
}

export function subscribePublicStore(
  onConfig: (settings: Partial<StoreSettings> | null) => void,
  onProducts: (products: Product[] | null) => void,
  onZones: (zones: DeliveryZone[] | null) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      doc(db, 'store', 'config'),
      (snap) => {
        if (!snap.exists()) {
          onConfig(null);
          return;
        }
        const data = snap.data() as Partial<StoreSettings>;
        onConfig(data);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, STORE_DOC_PATH);
      }
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, PRODUCTS_PATH), orderBy('sortOrder', 'asc')),
      (snap) => {
        if (snap.empty) {
          onProducts(null);
          return;
        }
        const list = snap.docs.map((d) => d.data() as Product);
        onProducts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, PRODUCTS_PATH);
      }
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, ZONES_PATH), orderBy('sortOrder', 'asc')),
      (snap) => {
        if (snap.empty) {
          onZones(null);
          return;
        }
        const list = snap.docs.map((d) => d.data() as DeliveryZone);
        onZones(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ZONES_PATH);
      }
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export function subscribeAdminOrders(
  onOrders: (orders: StoreOrder[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, ORDERS_PATH), orderBy('createdAt', 'desc')),
    (snap) => {
      const list = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        const ts = raw.createdAt as { toDate?: () => Date } | string | undefined;
        const iso =
          typeof ts === 'string'
            ? ts
            : ts && typeof ts === 'object' && typeof ts.toDate === 'function'
              ? ts.toDate().toISOString()
              : new Date().toISOString();
        return {
          ...(raw as unknown as StoreOrder),
          createdAt: iso,
        };
      });
      onOrders(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ORDERS_PATH);
    }
  );
}

export function subscribeAdminPin(onPin: (pin: string) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'storePrivate', 'settings'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { ownerPin?: string };
        if (data.ownerPin) onPin(data.ownerPin);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, STORE_PRIVATE_PATH);
    }
  );
}

export async function seedInitialStoreIfEmpty(
  currentSettings: StoreSettings,
  currentProducts: Product[],
  currentZones: DeliveryZone[]
): Promise<void> {
  try {
    const configSnap = await getDoc(doc(db, 'store', 'config'));
    const productsSnap = await getDocs(collection(db, PRODUCTS_PATH));
    const zonesSnap = await getDocs(collection(db, ZONES_PATH));
    const pinSnap = await getDoc(doc(db, 'storePrivate', 'settings'));

    const batch = writeBatch(db);
    let hasWrites = false;

    if (!configSnap.exists()) {
      batch.set(doc(db, 'store', 'config'), buildStoreConfigPayload(currentSettings));
      hasWrites = true;
    }

    if (!pinSnap.exists()) {
      batch.set(doc(db, 'storePrivate', 'settings'), {
        ownerPin: clampStr(currentSettings.ownerPin || '1110', 20),
        updatedAt: serverTimestamp(),
      });
      hasWrites = true;
    }

    if (productsSnap.empty) {
      currentProducts.forEach((p, idx) => {
        const payload = buildProductPayload(p, idx);
        batch.set(doc(db, PRODUCTS_PATH, payload.id), payload);
      });
      hasWrites = true;
    }

    if (zonesSnap.empty) {
      currentZones.forEach((z, idx) => {
        const payload = buildDeliveryZonePayload(z, idx);
        batch.set(doc(db, ZONES_PATH, payload.id), payload);
      });
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'store/seed');
  }
}

export async function saveStoreConfigToFirestore(
  settings: StoreSettings
): Promise<void> {
  try {
    await setDoc(doc(db, 'store', 'config'), buildStoreConfigPayload(settings));
    await setDoc(doc(db, 'storePrivate', 'settings'), {
      ownerPin: clampStr(settings.ownerPin || '1110', 20),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STORE_DOC_PATH);
  }
}

export async function saveProductToFirestore(
  product: Product,
  sortOrder: number
): Promise<void> {
  const payload = buildProductPayload(product, sortOrder);
  try {
    await setDoc(doc(db, PRODUCTS_PATH, payload.id), payload);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `${PRODUCTS_PATH}/${payload.id}`
    );
  }
}

export async function deleteProductFromFirestore(
  productId: string
): Promise<void> {
  const safeId = sanitizeId(productId);
  try {
    await deleteDoc(doc(db, PRODUCTS_PATH, safeId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${PRODUCTS_PATH}/${safeId}`
    );
  }
}

export async function syncAllProductsToFirestore(
  products: Product[]
): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, PRODUCTS_PATH));
    const nextIds = new Set(products.map((p) => sanitizeId(p.id)));
    const batch = writeBatch(db);

    existingSnap.docs.forEach((d) => {
      if (!nextIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    products.forEach((p, idx) => {
      const payload = buildProductPayload(p, idx);
      batch.set(doc(db, PRODUCTS_PATH, payload.id), payload);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_PATH);
  }
}

export async function syncDeliveryZonesToFirestore(
  zones: DeliveryZone[]
): Promise<void> {
  try {
    const existingSnap = await getDocs(collection(db, ZONES_PATH));
    const nextIds = new Set(zones.map((z) => sanitizeId(z.id)));
    const batch = writeBatch(db);

    existingSnap.docs.forEach((d) => {
      if (!nextIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });

    zones.forEach((z, idx) => {
      const payload = buildDeliveryZonePayload(z, idx);
      batch.set(doc(db, ZONES_PATH, payload.id), payload);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ZONES_PATH);
  }
}

export async function createOrderInFirestore(order: StoreOrder): Promise<void> {
  const safeId = sanitizeId(order.orderId);
  const payload = {
    orderId: safeId,
    status: 'Pending',
    customerName: clampStr(order.customerName, 120),
    phone: clampStr(order.phone, 40),
    cityLabel: clampStr(order.cityLabel, 120),
    address: clampStr(order.address, 300),
    instagramHandle: clampStr(order.instagramHandle, 80),
    items: order.items.slice(0, 30).map((i) => ({
      key: clampStr(i.key, 120),
      productId: clampStr(i.productId, 128),
      sku: clampStr(i.sku, 40),
      name: clampStr(i.name, 160),
      variant: clampStr(i.variant, 80),
      priceMad: Math.max(0, Number(i.priceMad) || 0),
      image: clampStr(i.image, 450000),
      quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
    })),
    subtotalMad: Math.max(0, Number(order.subtotalMad) || 0),
    shippingFeeMad: Math.max(0, Number(order.shippingFeeMad) || 0),
    totalMad: Math.max(0, Number(order.totalMad) || 0),
    eta: clampStr(order.eta, 60),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, ORDERS_PATH, safeId), payload);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `${ORDERS_PATH}/${safeId}`
    );
  }
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const safeId = sanitizeId(orderId);
  try {
    await updateDoc(doc(db, ORDERS_PATH, safeId), { status });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${ORDERS_PATH}/${safeId}`
    );
  }
}

export async function deleteOrderInFirestore(orderId: string): Promise<void> {
  const safeId = sanitizeId(orderId);
  try {
    await deleteDoc(doc(db, ORDERS_PATH, safeId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `${ORDERS_PATH}/${safeId}`
    );
  }
}
