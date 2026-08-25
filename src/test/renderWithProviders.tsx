import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CartProvider } from "@/features/cart/CartProvider";
import type { CartState } from "@/features/cart/types";

interface ProvidersOptions {
  /** Ruta inicial del MemoryRouter. Default: "/". */
  route?: string;
  /** Estado inicial del carrito. Default: carrito vacío (ver EMPTY_CART_STATE). */
  cartState?: CartState;
}

// Default explícito para "sin cartState", en vez de dejar que CartProvider
// caiga en su propio fallback (loadCartState(), que lee localStorage real).
// jsdom comparte un mismo localStorage entre todos los tests de un mismo
// archivo (Vitest aísla por archivo, no por "it"): si un test anterior agregó
// algo al carrito, ese resto queda escrito ahí. Sin este default, un test que
// no pase cartState heredaría ese resto en vez de arrancar limpio.
const EMPTY_CART_STATE: CartState = { items: [], totalItems: 0, totalPrice: 0 };

/**
 * Compone SOLO MemoryRouter + CartProvider: son los dos providers "puros" de
 * esta app (sin red, sin variables de entorno). A propósito NO incluye:
 *
 * - AuthProvider: se suscribe a Firebase real al montar (onAuthStateChanged),
 *   y arrastra lib/firebase.ts -> lib/env.ts, que valida las variables de
 *   entorno de Firebase al importarse. Sin un .env, cualquier test que lo
 *   monte revienta antes de llegar a un solo assert.
 * - ProductsProvider: arrastra la misma cadena de imports.
 *
 * Los tests que necesiten sesión mockean useAuth con vi.mock; los que
 * necesiten productos, mockean productsService o useProducts.
 */
export function createProvidersWrapper({
  route = "/",
  cartState = EMPTY_CART_STATE,
}: ProvidersOptions = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <CartProvider initialState={cartState}>{children}</CartProvider>
      </MemoryRouter>
    );
  };
}

type RenderWithProvidersOptions = ProvidersOptions & Omit<RenderOptions, "wrapper">;

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  // Se reenvía "options" completo, sin desestructurar route/cartState aparte:
  // hacerlo (para reconstruirlos en un objeto nuevo) rompería con
  // exactOptionalPropertyTypes, porque una propiedad desestructurada de un campo
  // opcional queda tipada "T | undefined", y escribir eso en un objeto LITERAL
  // nuevo en una clave opcional es justo lo que esa flag prohíbe. RTL's render()
  // ignora las claves de más (route/cartState) que no le pertenecen.
  return render(ui, {
    ...options,
    wrapper: createProvidersWrapper(options),
  });
}
