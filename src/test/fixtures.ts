import { Timestamp } from "firebase/firestore";
import type { Product } from "@/types/product";
import type { UserProfile } from "@/types/user";
import type { CartItem, CartState } from "@/features/cart/types";
import type { Order } from "@/types/order";

// Fecha fija (no Date.now()) para que dos tests que usen esta fixture en el
// mismo assert obtengan siempre el mismo valor, sin depender de cuándo corren.
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");

// Constante aparte (no "productFixture.price"): en el dominio real, Product.price
// es opcional (un documento del catálogo puede no tenerlo), así que
// "productFixture.price" queda tipado "number | undefined" pese a valer 100 acá.
// CartItem.unitPrice y OrderItemSnapshot.priceAtPurchase son "number" obligatorio:
// asignarles esa fixture no compilaría.
const PRODUCT_FIXTURE_PRICE = 100;

export const productFixture: Product = {
  id: "p-1",
  name: "Producto de prueba",
  nameLower: "producto de prueba",
  categoryId: "cat-1",
  price: PRODUCT_FIXTURE_PRICE,
  imageUrl: "https://example.com/img.png",
};

export const cartItemFixture: CartItem = {
  productId: productFixture.id,
  name: productFixture.name,
  unitPrice: PRODUCT_FIXTURE_PRICE,
  quantity: 1,
};

export const cartStateFixture: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

// Mismo carrito, pero con un ítem ya cargado: para tests que necesitan
// arrancar con algo adentro sin simular los clicks que lo llenaron.
export const cartStateWithItemFixture: CartState = {
  items: [cartItemFixture],
  totalItems: cartItemFixture.quantity,
  totalPrice: cartItemFixture.unitPrice * cartItemFixture.quantity,
};

export const userCustomerFixture: UserProfile = {
  uid: "u-customer",
  email: "customer@test.com",
  displayName: "Cliente de prueba",
  role: "customer",
  createdAt: Timestamp.fromDate(FIXED_DATE),
};

export const userAdminFixture: UserProfile = {
  uid: "u-admin",
  email: "admin@test.com",
  displayName: "Admin de prueba",
  role: "admin",
  createdAt: Timestamp.fromDate(FIXED_DATE),
};

export const orderFixture: Order = {
  id: "o-1",
  userId: userCustomerFixture.uid,
  items: [
    {
      productId: productFixture.id,
      name: productFixture.name,
      priceAtPurchase: PRODUCT_FIXTURE_PRICE,
      quantity: 1,
    },
  ],
  total: PRODUCT_FIXTURE_PRICE,
  status: "pending",
  createdAt: FIXED_DATE,
};
