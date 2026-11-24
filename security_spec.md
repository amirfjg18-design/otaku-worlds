# Security Specification & Dirty Dozen Payloads (Phase 0)

## 1. Data Invariants
1. **Admin-Only Storefront Mutations**: Only verified store admins (`otakuworlde1@gmail.com` with `email_verified == true` or UIDs in `/admins/{uid}`) may create, update, or delete `/store/config`, `/storePrivate/{docId}`, `/products/{productId}`, or `/deliveryZones/{zoneId}`.
2. **Public Catalog Readability**: Shoppers (including unauthenticated Instagram visitors) can `get` `/store/config` and `get`/`list` `/products` and `/deliveryZones`, which contain zero PII.
3. **Strict PII Isolation for Orders**: Customer orders in `/orders/{orderId}` contain PII (`customerName`, `phone`, `address`). Unauthenticated shoppers may only `create` a new order in `Pending` state with `createdAt == request.time`; `get`, `list`, `update`, and `delete` on `/orders` are strictly restricted to `isAdmin()`.
4. **Schema & Size Guarding**: All string and list fields enforce `.size()` upper bounds, strict `hasAll`/`hasOnly` field allowlists, and regex-validated document IDs (`^[a-zA-Z0-9_\-]+$`).

## 2. Dirty Dozen Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated write to `/store/config` attempting to hijack `instagramHandle`.
2. Signed-in non-admin user (`other@gmail.com`) creating a product in `/products/fake-1`.
3. Unverified email admin token (`email_verified: false`) updating `/products/shadow-ronin-figure`.
4. Admin writing a shadow field `isHacked: true` to `/products/shadow-ronin-figure` (rejected by `hasOnly`).
5. Non-admin reading `/orders/ASM-1001` (`get`) or listing `/orders` (`list`).
6. Shopper creating an order with spoofed status `status: "Delivered"` instead of `"Pending"`.
7. Shopper creating an order with client-forged `createdAt` instead of `request.time`.
8. Shopper creating an order with empty `items: []` or >30 items.
9. Shopper creating an order with negative `totalMad: -500`.
10. Shopper creating an order with mismatched document ID (`orderId != {orderId}`) or invalid path ID (`../../etc`).
11. Shopper updating `/orders/ASM-1001` to change `totalMad` after creation.
12. Non-admin reading `/storePrivate/settings` (owner PIN isolation).
