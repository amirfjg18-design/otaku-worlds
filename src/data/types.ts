export type ProductCategory =
  | 'All'
  | 'Anime Figures'
  | 'China Imports'
  | 'Streetwear'
  | 'Desk & Lamps';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  origin: string;
  priceMad: number;
  image: string;
  shortDesc: string;
  description: string;
  variants: string[];
  dimensions: string;
  material: string;
  stockCount: number;
  availabilityLabel: string;
}

export interface DeliveryZone {
  id: string;
  city: string;
  method: string;
  eta: string;
  feeMad: number;
}

export interface TrustPillar {
  title: string;
  subtitle: string;
}

export type AccentColorKey = 'crimson' | 'cobalt' | 'emerald' | 'amber' | 'ink';

export interface StoreSettings {
  brandName: string;
  announcementText: string;
  showAnnouncement: boolean;
  instagramHandle: string;
  instagramUrl: string;
  whatsappNumber: string;
  city: string;
  accentColor: AccentColorKey;
  heroKicker: string;
  heroTitle: string;
  heroDescription: string;
  heroCtaText: string;
  heroImage: string;
  catalogKicker: string;
  catalogTitle: string;
  aboutKicker: string;
  aboutTitle: string;
  aboutParagraph1: string;
  aboutParagraph2: string;
  footerTagline: string;
  freeKenitraThreshold: number;
  freeNationalThreshold: number;
  ownerPin: string;
  trustPillars: TrustPillar[];
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered';

export interface OrderItem {
  key: string;
  productId: string;
  sku: string;
  name: string;
  variant: string;
  priceMad: number;
  image: string;
  quantity: number;
}

export interface StoreOrder {
  orderId: string;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  cityLabel: string;
  address: string;
  instagramHandle: string;
  items: OrderItem[];
  subtotalMad: number;
  shippingFeeMad: number;
  totalMad: number;
  eta: string;
}

export interface StorePayload {
  settings: StoreSettings;
  products: Product[];
  deliveryZones: DeliveryZone[];
  orders: StoreOrder[];
}
