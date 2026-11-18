import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DeliveryZone,
  OrderItem,
  StoreOrder,
  StoreSettings,
} from '../data/types';
import { ResilientImage } from './ResilientImage';

export type CartItem = OrderItem;

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  settings: StoreSettings;
  deliveryZones: DeliveryZone[];
  onClose: () => void;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (order: StoreOrder) => void;
}

export function CartDrawer({
  isOpen,
  items,
  settings,
  deliveryZones,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onSubmitOrder,
}: CartDrawerProps) {
  const [selectedZoneId, setSelectedZoneId] = useState(
    deliveryZones[1]?.id || deliveryZones[0]?.id || ''
  );
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (
      deliveryZones.length > 0 &&
      !deliveryZones.some((z) => z.id === selectedZoneId)
    ) {
      setSelectedZoneId(deliveryZones[0].id);
    }
  }, [deliveryZones, selectedZoneId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotalMad = items.reduce(
    (sum, item) => sum + item.priceMad * item.quantity,
    0
  );

  const selectedZone =
    deliveryZones.find((z) => z.id === selectedZoneId) ||
    deliveryZones[0] || {
      id: 'default',
      city: settings.city,
      method: 'Cash on Delivery',
      eta: '24–48 Hours',
      feeMad: 0,
    };

  const isLocalCityZone = selectedZone.city
    .toLowerCase()
    .includes(settings.city.toLowerCase());
  const qualifiesFreeShipping =
    selectedZone.feeMad === 0 ||
    (isLocalCityZone && subtotalMad >= settings.freeKenitraThreshold) ||
    subtotalMad >= settings.freeNationalThreshold;

  const shippingFeeMad =
    items.length === 0 || qualifiesFreeShipping ? 0 : selectedZone.feeMad;
  const totalMad = subtotalMad + shippingFeeMad;

  const remainingForFreeNational = Math.max(
    0,
    settings.freeNationalThreshold - subtotalMad
  );

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setFormError(
        'Please enter your full name, Moroccan phone number, and delivery address.'
      );
      return;
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const order: StoreOrder = {
      orderId: `ASM-${randomCode}`,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      customerName: customerName.trim(),
      phone: phone.trim(),
      cityLabel: selectedZone.city,
      address: address.trim(),
      instagramHandle: instagramHandle.trim(),
      items: [...items],
      subtotalMad,
      shippingFeeMad,
      totalMad,
      eta: selectedZone.eta,
    };

    setFormError('');
    setConfirmedOrder(order);
    onSubmitOrder(order);
    onClearCart();
  };

  const buildOrderSummaryText = (order: StoreOrder) => {
    const lines = [
      `Salam ${settings.instagramHandle}! Order #${order.orderId}`,
      `Name: ${order.customerName}`,
      `Phone: ${order.phone}`,
      `City: ${order.cityLabel}`,
      `Address: ${order.address}`,
      order.instagramHandle ? `IG: ${order.instagramHandle}` : null,
      '--- Items ---',
      ...order.items.map(
        (i) =>
          `- ${i.quantity}x ${i.name} (${i.variant}) = ${
            i.priceMad * i.quantity
          } MAD`
      ),
      `Shipping: ${order.shippingFeeMad === 0 ? 'Free' : `${order.shippingFeeMad} MAD`}`,
      `Total (COD): ${order.totalMad} MAD`,
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    if (!confirmedOrder) return;
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText(confirmedOrder));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      setCopiedSummary(false);
    }
  };

  const handleCloseDrawer = () => {
    setConfirmedOrder(null);
    setFormError('');
    onClose();
  };

  const cleanWhatsapp = settings.whatsappNumber.replace(/[^\d]/g, '');

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Cash on Delivery Checkout"
      onClick={handleCloseDrawer}
    >
      <div
        className="w-full max-w-md bg-white h-full flex flex-col border-l border-zinc-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-zinc-900" strokeWidth={1.75} />
            <h2 className="font-display text-lg font-bold text-zinc-950">
              {confirmedOrder ? 'Order Confirmed' : 'Your Bag & COD Checkout'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
            aria-label="Close bag drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {confirmedOrder ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    Order #{confirmedOrder.orderId} Confirmed — Preparing Shipment
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Dispatched from {settings.city} ({confirmedOrder.eta}).
                  Payment is collected in cash upon delivery (
                  {confirmedOrder.totalMad} MAD).
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                <h3 className="font-semibold text-zinc-950">Receipt Summary</h3>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                  {confirmedOrder.items.map((item) => (
                    <div
                      key={item.key}
                      className="px-4 py-3 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">
                          {item.quantity}x {item.name}
                        </p>
                        <p className="text-xs text-zinc-500">{item.variant}</p>
                      </div>
                      <span className="font-mono text-xs font-medium tabular-nums text-zinc-900 shrink-0">
                        {item.priceMad * item.quantity} MAD
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-zinc-50 space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Delivery ({confirmedOrder.cityLabel})</span>
                      <span className="font-mono tabular-nums">
                        {confirmedOrder.shippingFeeMad === 0
                          ? 'Free'
                          : `${confirmedOrder.shippingFeeMad} MAD`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-zinc-950 pt-1">
                      <span>Total Due on Delivery</span>
                      <span className="font-mono tabular-nums">
                        {confirmedOrder.totalMad} MAD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full h-11 px-4 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-900 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>
                    {copiedSummary
                      ? 'Order Summary Copied'
                      : 'Copy Order Details for DM'}
                  </span>
                </button>
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 px-4 rounded-lg bg-zinc-950 hover:bg-red-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Send Confirmation on {settings.instagramHandle}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                      buildOrderSummaryText(confirmedOrder)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 px-4 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Send via WhatsApp</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag
                className="w-10 h-10 text-zinc-300 mx-auto"
                strokeWidth={1.5}
              />
              <h3 className="font-display text-base font-semibold text-zinc-900">
                Your bag is empty
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                Add anime figures, Chinese collectibles, or streetwear from the{' '}
                {settings.city} catalog to place a Cash on Delivery order.
              </p>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-zinc-950 text-white text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            <>
              {/* Free Delivery Threshold Notice */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1.5">
                {qualifiesFreeShipping ? (
                  <p className="font-medium text-zinc-900">
                    Your order qualifies for free delivery on this zone.
                  </p>
                ) : (
                  <p>
                    Add{' '}
                    <span className="font-mono font-semibold tabular-nums text-zinc-950">
                      {remainingForFreeNational} MAD
                    </span>{' '}
                    more for free nationwide shipping across Morocco (or{' '}
                    <span className="font-mono font-semibold tabular-nums">
                      {settings.freeKenitraThreshold} MAD
                    </span>{' '}
                    in {settings.city}).
                  </p>
                )}
              </div>

              {/* Itemized List */}
              <ul className="divide-y divide-zinc-200">
                {items.map((item) => (
                  <li key={item.key} className="py-4 flex gap-4">
                    <ResilientImage
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-16 rounded-lg object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-950 truncate">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.key)}
                          className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.variant}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center border border-zinc-200 rounded-md h-8 bg-white">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, -1)}
                            className="w-7 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-950 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.key, 1)}
                            className="w-7 h-full flex items-center justify-center text-zinc-600 hover:text-zinc-950 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950">
                          {item.priceMad * item.quantity} MAD
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* COD Verification Form */}
              <form
                id="cod-checkout-form"
                onSubmit={handleCheckoutSubmit}
                className="space-y-3.5 pt-4 border-t border-zinc-200"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-zinc-950">
                    Cash on Delivery Details
                  </h3>
                  <span className="text-xs text-zinc-500">Pay on arrival</span>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    {formError}
                  </p>
                )}

                <div>
                  <label
                    htmlFor="cod-name"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="cod-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Yassine El Amrani"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cod-phone"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Phone Number (WhatsApp / Call)
                  </label>
                  <input
                    id="cod-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 XX XX XX XX"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cod-zone"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    City &amp; Delivery Zone
                  </label>
                  <select
                    id="cod-zone"
                    value={selectedZone.id}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950"
                  >
                    {deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.city} —{' '}
                        {zone.feeMad === 0 ? 'Free' : `${zone.feeMad} MAD`} (
                        {zone.eta})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cod-address"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Neighborhood / Street Address
                  </label>
                  <input
                    id="cod-address"
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={`e.g. Bir Rami Ouest, ${settings.city}`}
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cod-ig"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Instagram Handle (Optional)
                  </label>
                  <input
                    id="cod-ig"
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@your.username"
                    className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer Totals & Submit */}
        {!confirmedOrder && items.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{subtotalMad} MAD</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping ({selectedZone.eta})</span>
                <span className="font-mono tabular-nums">
                  {shippingFeeMad === 0 ? 'Free' : `${shippingFeeMad} MAD`}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-950 pt-1 border-t border-zinc-200">
                <span>Total (Cash on Delivery)</span>
                <span className="font-mono tabular-nums">{totalMad} MAD</span>
              </div>
            </div>

            <button
              type="submit"
              form="cod-checkout-form"
              className="w-full h-11 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors duration-150 cursor-pointer"
            >
              Confirm COD Order · {totalMad} MAD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
