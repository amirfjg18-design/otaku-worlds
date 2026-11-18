import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STORE_PAYLOAD } from './src/data/defaults.ts';
import type {
  DeliveryZone,
  OrderStatus,
  Product,
  StoreOrder,
  StorePayload,
  StoreSettings,
} from './src/data/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store-data.json');

function ensureStoreData(): StorePayload {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(DEFAULT_STORE_PAYLOAD, null, 2),
      'utf-8'
    );
    return structuredClone(DEFAULT_STORE_PAYLOAD);
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
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
    return structuredClone(DEFAULT_STORE_PAYLOAD);
  }
}

function saveStoreData(payload: StorePayload): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '8mb' }));

  // Get full store data
  app.get('/api/store', (_req, res) => {
    const data = ensureStoreData();
    res.json(data);
  });

  // Update store settings, products, and delivery zones
  app.put('/api/store', (req, res) => {
    const current = ensureStoreData();
    const body = req.body as Partial<{
      settings: StoreSettings;
      products: Product[];
      deliveryZones: DeliveryZone[];
    }>;

    const updated: StorePayload = {
      settings: body.settings
        ? { ...current.settings, ...body.settings }
        : current.settings,
      products: Array.isArray(body.products) ? body.products : current.products,
      deliveryZones: Array.isArray(body.deliveryZones)
        ? body.deliveryZones
        : current.deliveryZones,
      orders: current.orders,
    };

    saveStoreData(updated);
    res.json(updated);
  });

  // Reset storefront to default Kenitra catalog (keeps existing orders)
  app.post('/api/store/reset', (_req, res) => {
    const current = ensureStoreData();
    const resetPayload: StorePayload = {
      settings: structuredClone(DEFAULT_STORE_PAYLOAD.settings),
      products: structuredClone(DEFAULT_STORE_PAYLOAD.products),
      deliveryZones: structuredClone(DEFAULT_STORE_PAYLOAD.deliveryZones),
      orders: current.orders,
    };
    saveStoreData(resetPayload);
    res.json(resetPayload);
  });

  // Create a new COD order
  app.post('/api/orders', (req, res) => {
    const current = ensureStoreData();
    const incoming = req.body as StoreOrder;
    if (
      !incoming ||
      !incoming.orderId ||
      !incoming.customerName ||
      !incoming.phone ||
      !Array.isArray(incoming.items)
    ) {
      res.status(400).json({ error: 'Invalid order payload' });
      return;
    }

    const order: StoreOrder = {
      ...incoming,
      createdAt: incoming.createdAt || new Date().toISOString(),
      status: incoming.status || 'Pending',
    };

    const updated: StorePayload = {
      ...current,
      orders: [order, ...current.orders],
    };
    saveStoreData(updated);
    res.status(201).json({ ok: true, order });
  });

  // Update order status
  app.patch('/api/orders/:orderId', (req, res) => {
    const current = ensureStoreData();
    const { orderId } = req.params;
    const { status } = req.body as { status?: OrderStatus };
    const allowed: OrderStatus[] = [
      'Pending',
      'Confirmed',
      'Shipped',
      'Delivered',
    ];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const updatedOrders = current.orders.map((o) =>
      o.orderId === orderId ? { ...o, status } : o
    );
    const updated: StorePayload = { ...current, orders: updatedOrders };
    saveStoreData(updated);
    res.json({ ok: true, orders: updatedOrders });
  });

  // Delete an order
  app.delete('/api/orders/:orderId', (req, res) => {
    const current = ensureStoreData();
    const { orderId } = req.params;
    const updatedOrders = current.orders.filter((o) => o.orderId !== orderId);
    const updated: StorePayload = { ...current, orders: updatedOrders };
    saveStoreData(updated);
    res.json({ ok: true, orders: updatedOrders });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Anime Store MA server running on http://0.0.0.0:${port}`);
  });
}

startServer();
