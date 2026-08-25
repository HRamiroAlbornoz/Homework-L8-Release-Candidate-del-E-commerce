import { renderHook, act } from "@testing-library/react";
import { useCart } from "./useCart";
import { createProvidersWrapper } from "@/test/renderWithProviders";
import { cartStateWithItemFixture, cartItemFixture } from "@/test/fixtures";

// A diferencia de cartReducer.test.ts (que testea la función pura), esto
// prueba el "cableado" real: que useCart() dentro de un CartProvider monte
// useReducer, dispatchee, y devuelva un estado observable actualizado. Las
// aserciones son sobre resultado (items/totales), nunca sobre implementación
// interna (no se espía "dispatch").
describe("useCart", () => {
  it("updateQuantity actualiza items, totalItems y totalPrice de forma observable", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createProvidersWrapper({ cartState: cartStateWithItemFixture }),
    });

    act(() => {
      result.current.updateQuantity(cartItemFixture.productId, 3);
    });

    expect(result.current.items[0]?.quantity).toBe(3);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.totalPrice).toBe(cartItemFixture.unitPrice * 3);
  });

  it("updateQuantity con 0 elimina el ítem (mismo comportamiento observable que el reducer)", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createProvidersWrapper({ cartState: cartStateWithItemFixture }),
    });

    act(() => {
      result.current.updateQuantity(cartItemFixture.productId, 0);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("compone addItem + updateQuantity manteniendo los totales consistentes", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: createProvidersWrapper(),
    });

    act(() => {
      result.current.addItem({ productId: "p-9", name: "Gorra", unitPrice: 50 });
    });
    act(() => {
      result.current.updateQuantity("p-9", 4);
    });

    expect(result.current.totalItems).toBe(4);
    expect(result.current.totalPrice).toBe(200);
  });
});
